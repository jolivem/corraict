import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { loadEnv } from '../config/env';
import { EmailService } from './email.service';

export interface SessionContext {
  userId: string;
  sessionId: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async requestCode(emailAddr: string, ip?: string, locale: 'fr' | 'en' = 'fr'): Promise<void> {
    // Compte de test (revue Play Store) : aucun email envoyé ; le code fixe est
    // accepté directement par verifyCode.
    if (this.isTestEmail(emailAddr)) return;

    const windowStart = new Date(Date.now() - this.env.AUTH_CODE_RATE_LIMIT_WINDOW_SECONDS * 1000);
    const recentCount = await this.prisma.authCode.count({
      where: { email: emailAddr, createdAt: { gt: windowStart } },
    });
    if (recentCount >= this.env.AUTH_CODE_RATE_LIMIT_MAX) {
      throw new HttpException('Too many code requests, try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = this.generateNumericCode(this.env.AUTH_CODE_LENGTH);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + this.env.AUTH_CODE_TTL_SECONDS * 1000);

    await this.prisma.authCode.create({
      data: { email: emailAddr, codeHash, expiresAt, ip: ip ?? null },
    });

    try {
      await this.email.sendAuthCode(emailAddr, code, locale);
    } catch (err) {
      this.logger.error(`Email send failed for ${emailAddr}`, err as Error);
      // Do not leak — but the row already exists; the user can retry.
      throw new BadRequestException('Could not send email, try again later');
    }
  }

  async verifyCode(
    emailAddr: string,
    code: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ sessionToken: string; userId: string; expiresAt: Date }> {
    // Bypass compte de test : code fixe accepté sans email ni AuthCode.
    if (this.isTestLogin(emailAddr, code)) {
      this.logger.warn(`Test-account login used (${emailAddr})`);
      return this.issueSession(emailAddr, ctx);
    }

    const candidates = await this.prisma.authCode.findMany({
      where: { email: emailAddr, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    if (candidates.length === 0) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    let matched: (typeof candidates)[number] | null = null;
    for (const cand of candidates) {
      if (cand.attempts >= this.env.AUTH_CODE_MAX_ATTEMPTS) continue;
      // Always increment attempts to bound brute-force, even on the matching row.
      if (await bcrypt.compare(code, cand.codeHash)) {
        matched = cand;
        break;
      }
    }

    if (!matched) {
      // Increment attempts on the most recent unused code (best-effort bound on guesses per code).
      await this.prisma.authCode.update({
        where: { id: candidates[0].id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired code');
    }

    await this.prisma.authCode.update({
      where: { id: matched.id },
      data: { usedAt: new Date(), attempts: { increment: 1 } },
    });

    return this.issueSession(emailAddr, ctx);
  }

  /** Crée (ou retrouve) l'utilisateur et ouvre une session. Chemin commun au
   *  login normal et au compte de test. */
  private async issueSession(
    emailAddr: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<{ sessionToken: string; userId: string; expiresAt: Date }> {
    // First successful verify counts as RGPD consent — the login form makes
    // the privacy policy link visible at the time the code is submitted.
    const user = await this.prisma.user.upsert({
      where: { email: emailAddr },
      update: {},
      create: { email: emailAddr, gdprConsentAt: new Date() },
    });

    const sessionToken = this.generateOpaqueToken();
    const tokenHash = this.sha256(sessionToken);
    const expiresAt = new Date(Date.now() + this.env.SESSION_TTL_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
        ip: ctx.ip ?? null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth.login',
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent?.slice(0, 512) ?? null,
      },
    });

    return { sessionToken, userId: user.id, expiresAt };
  }

  /** Vrai si l'email correspond au compte de test configuré (TEST_LOGIN_EMAIL). */
  private isTestEmail(emailAddr: string): boolean {
    const t = this.env.TEST_LOGIN_EMAIL;
    return !!t && emailAddr.toLowerCase() === t.toLowerCase();
  }

  /** Vrai si (email, code) correspondent au compte de test (les deux env requis). */
  private isTestLogin(emailAddr: string, code: string): boolean {
    const c = this.env.TEST_LOGIN_CODE;
    return this.isTestEmail(emailAddr) && !!c && code === c;
  }

  async resolveSession(sessionToken: string): Promise<SessionContext | null> {
    const tokenHash = this.sha256(sessionToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.deletedAt ||
      session.user.suspendedAt
    ) {
      return null;
    }
    // Best-effort lastSeen update; not awaited critical path.
    void this.prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);

    return { userId: session.userId, sessionId: session.id, email: session.user.email };
  }

  async logout(sessionToken: string): Promise<void> {
    const tokenHash = this.sha256(sessionToken);
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  private generateNumericCode(length: number): string {
    // Cryptographically uniform via rejection sampling.
    const out: string[] = [];
    while (out.length < length) {
      const buf = randomBytes(length);
      for (const b of buf) {
        if (out.length >= length) break;
        // 250 = floor(256/10)*10 → reject 250..255 to avoid modulo bias.
        if (b < 250) out.push(String(b % 10));
      }
    }
    return out.join('');
  }

  private generateOpaqueToken(): string {
    // 32 random bytes → base64url, ~256 bits of entropy.
    return randomBytes(32).toString('base64url');
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

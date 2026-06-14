import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  RequestCodeSchema,
  type RequestCodeDto,
  VerifyCodeSchema,
  type VerifyCodeDto,
} from './dto/auth.dto';
import { SessionGuard } from './guards/session.guard';
import { ApiTokenGuard } from './guards/api-token.guard';
import { CurrentUser, type AuthPrincipal } from './decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  private readonly env = loadEnv();

  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('request-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestCode(
    @Body(new ZodValidationPipe(RequestCodeSchema)) body: RequestCodeDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.auth.requestCode(body.email, this.clientIp(req), body.locale ?? 'fr');
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body(new ZodValidationPipe(VerifyCodeSchema)) body: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string; email: string }> {
    const result = await this.auth.verifyCode(body.email, body.code, {
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.setSessionCookie(res, result.sessionToken, result.expiresAt);
    return { userId: result.userId, email: body.email };
  }

  /**
   * Magic-link mobile, étape 1 : l'app appelle cet endpoint avec son token d'API
   * (Authorization: Bearer aic_…) et reçoit une URL de connexion web à usage
   * unique, à ouvrir dans le navigateur. Le token d'API ne quitte jamais l'app.
   */
  @Post('web-session')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ApiTokenGuard)
  async createWebSession(
    @CurrentUser() user: AuthPrincipal,
    @Req() req: Request,
  ): Promise<{ url: string; expiresAt: string }> {
    const { ticket, expiresAt } = await this.auth.createWebLoginTicket(user.userId, {
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    const url = `${this.env.PUBLIC_API_URL}/v1/auth/web-session/redeem?ticket=${encodeURIComponent(ticket)}`;
    return { url, expiresAt: expiresAt.toISOString() };
  }

  /**
   * Magic-link mobile, étape 2 : ouverte dans le navigateur. Échange le ticket
   * contre une session web (pose le cookie) puis redirige vers le tableau de bord.
   * Ticket invalide/expiré → redirection vers l'accueil (qui proposera le login).
   */
  @Get('web-session/redeem')
  async redeemWebSession(
    @Query('ticket') ticket: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = ticket
      ? await this.auth.redeemWebLoginTicket(ticket, {
          ip: this.clientIp(req),
          userAgent: req.headers['user-agent'],
        })
      : null;

    if (!result) {
      res.redirect(HttpStatus.FOUND, `${this.env.PUBLIC_WEB_URL}/`);
      return;
    }
    this.setSessionCookie(res, result.sessionToken, result.expiresAt);
    res.redirect(HttpStatus.FOUND, `${this.env.PUBLIC_WEB_URL}/${result.locale}/dashboard`);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[this.env.SESSION_COOKIE_NAME];
    if (token) await this.auth.logout(token);
    this.clearSessionCookie(res);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: AuthPrincipal) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        locale: true,
        monthlyRequestQuota: true,
      },
    });
    if (!row) {
      // SessionGuard l'a validé : ne devrait pas arriver, mais on reste défensif.
      return { userId: user.userId, email: 'email' in user ? user.email : undefined };
    }
    // Quota effectif exposé au front : `null` = illimité.
    // Cas illimité : ADMIN, plan=PRO (cadeau admin), ou subscription Stripe
    // active. Pour ne pas multiplier les appels DB, /me ne consulte pas
    // Subscription — c'est le dashboard qui détermine "actif" via
    // /v1/billing/subscription et masque la barre de quota de son côté.
    const isUnlimited = row.role === 'ADMIN' || row.plan === 'PRO';
    const effectiveQuota = isUnlimited
      ? null
      : (row.monthlyRequestQuota ?? this.env.FREE_TIER_MONTHLY_QUOTA);
    return {
      userId: row.id,
      email: row.email,
      role: row.role,
      plan: row.plan,
      locale: row.locale,
      effectiveQuota,
    };
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(this.env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.SESSION_COOKIE_DOMAIN,
      expires: expiresAt,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.SESSION_COOKIE_DOMAIN,
      path: '/',
    });
  }

  private clientIp(req: Request): string | undefined {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
    return req.socket.remoteAddress ?? undefined;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface ApiTokenContext {
  userId: string;
  apiTokenId: string;
}

@Injectable()
export class TokensService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, label: string): Promise<{ id: string; token: string; label: string; createdAt: Date }> {
    const token = `aic_${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.sha256(token);
    const row = await this.prisma.apiToken.create({
      data: { userId, label, tokenHash },
    });
    // The plaintext token is only returned here — never again.
    return { id: row.id, token, label: row.label, createdAt: row.createdAt };
  }

  async list(userId: string) {
    const rows = await this.prisma.apiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, lastUsedAt: true, createdAt: true },
    });
    return rows;
  }

  async revoke(userId: string, id: string): Promise<void> {
    const row = await this.prisma.apiToken.findFirst({ where: { id, userId, revokedAt: null } });
    if (!row) throw new NotFoundException('Token not found');
    await this.prisma.apiToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
  }

  async resolveBearer(rawToken: string): Promise<ApiTokenContext | null> {
    const tokenHash = this.sha256(rawToken);
    const row = await this.prisma.apiToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row || row.revokedAt || row.user.deletedAt) return null;
    void this.prisma.apiToken
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return { userId: row.userId, apiTokenId: row.id };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaExceededException } from '../common/quota-exceeded.exception';

/**
 * Décide si un utilisateur peut consommer une requête /v1/correct.
 *
 * Règles (dans l'ordre) :
 *   1. ADMIN : bypass total.
 *   2. Compte suspendu ou soft-deleted : 403 `account_suspended`.
 *   3. Subscription active (`trialing` ou `active`) : pas de limite.
 *   4. Sinon tier FREE : compteur UsageMonthly < quota effectif sinon 402.
 *
 * Quota effectif = `user.monthlyRequestQuota` (override) sinon
 * `env.FREE_TIER_MONTHLY_QUOTA`. Le compteur est lu sur la table
 * `UsageMonthly` déjà alimentée par `UsageService.record()`.
 */
@Injectable()
export class QuotaService {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  async assertCanCorrect(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        plan: true,
        monthlyRequestQuota: true,
        suspendedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      // Token valide mais user introuvable : on traite comme suspendu (safe fallback).
      throw new QuotaExceededException({
        code: 'account_suspended',
        message: 'Account not found',
      });
    }

    if (user.role === 'ADMIN') return;

    if (user.suspendedAt || user.deletedAt) {
      throw new QuotaExceededException({
        code: 'account_suspended',
        message: 'Account is suspended',
      });
    }

    // Subscription active = accès illimité (le tier PRO suppose une sub).
    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['trialing', 'active'] } },
      select: { id: true },
    });
    if (activeSub) return;

    const effectiveQuota = user.monthlyRequestQuota ?? this.env.FREE_TIER_MONTHLY_QUOTA;
    const yearMonth = this.currentYearMonth();
    const monthly = await this.prisma.usageMonthly.findUnique({
      where: { userId_yearMonth: { userId, yearMonth } },
      select: { requests: true },
    });
    const used = monthly?.requests ?? 0;

    if (used >= effectiveQuota) {
      throw new QuotaExceededException({
        code: 'quota_exceeded',
        message: `Monthly free quota of ${effectiveQuota} requests reached`,
        quota: effectiveQuota,
        used,
        retryAt: this.nextMonthStartIso(),
      });
    }
  }

  private currentYearMonth(): string {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private nextMonthStartIso(): string {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
  }
}

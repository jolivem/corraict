import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaExceededException } from '../common/quota-exceeded.exception';

/**
 * Décide si un utilisateur peut consommer une requête /v1/correct.
 *
 * Règles (dans l'ordre) :
 *   1. ADMIN : bypass total.
 *   2. Compte de test (revue Google Play) : bypass total.
 *   3. Compte suspendu ou soft-deleted : 403 `account_suspended`.
 *   4. Cadeau admin `plan = PRO` : pas de limite.
 *   5. Subscription Stripe active (`trialing` ou `active`) : pas de limite.
 *   6. Sinon : aucun accès gratuit → 402 `billing_required`. Le client
 *      (app/web) invite alors l'utilisateur à s'abonner (essai gratuit).
 *
 * Il n'y a plus de palier gratuit (les corrections nécessitent un abonnement,
 * avec essai gratuit via Stripe Checkout).
 */
@Injectable()
export class QuotaService {
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  async assertCanCorrect(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        plan: true,
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

    // Compte de test (revue Google Play) : accès complet sans abonnement, pour
    // que les testeurs puissent essayer le correcteur. Aligné sur le bypass
    // d'authentification du compte de test dans AuthService.
    if (
      this.env.TEST_LOGIN_EMAIL &&
      user.email.toLowerCase() === this.env.TEST_LOGIN_EMAIL.toLowerCase()
    ) {
      return;
    }

    if (user.suspendedAt || user.deletedAt) {
      throw new QuotaExceededException({
        code: 'account_suspended',
        message: 'Account is suspended',
      });
    }

    // "Cadeau admin" : si un admin a forcé manuellement le plan à PRO via
    // /v1/admin/users/:id/plan, le user a accès illimité sans avoir besoin
    // d'une Subscription Stripe. Le champ User.plan reste FREE par défaut
    // pour les comptes ordinaires et n'est jamais touché par les webhooks.
    if (user.plan === 'PRO') return;

    // Subscription Stripe active = accès illimité (chemin standard payant).
    const activeSub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['trialing', 'active'] } },
      select: { id: true },
    });
    if (activeSub) return;

    // Plus de palier gratuit : sans abonnement actif (ni cadeau Pro, ni admin,
    // ni compte de test), l'accès au correcteur est refusé. Le client affiche
    // une invite d'abonnement (essai gratuit via Stripe Checkout) sur ce code.
    throw new QuotaExceededException({
      code: 'billing_required',
      message: 'An active subscription is required to use the corrector',
    });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeClient } from '../billing/stripe.client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeClient,
  ) {}

  /**
   * RGPD article 20 — portability. Returns every piece of metadata we hold for
   * this user. No text is included because we never store corrected text.
   */
  async exportUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        locale: true,
        stripeCustomerId: true,
        gdprConsentAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [sessions, apiTokens, subscriptions, paymentMethods, invoices, usageEvents, usageMonthly, auditLogs] =
      await Promise.all([
        this.prisma.session.findMany({
          where: { userId },
          select: { id: true, lastSeenAt: true, expiresAt: true, ip: true, userAgent: true, createdAt: true },
        }),
        this.prisma.apiToken.findMany({
          where: { userId },
          select: { id: true, label: true, lastUsedAt: true, createdAt: true, revokedAt: true },
        }),
        this.prisma.subscription.findMany({ where: { userId } }),
        this.prisma.paymentMethod.findMany({ where: { userId } }),
        this.prisma.invoice.findMany({ where: { userId } }),
        this.prisma.usageEvent.findMany({
          where: { userId },
          select: {
            id: true,
            ts: true,
            wordsIn: true,
            charsIn: true,
            model: true,
            latencyMs: true,
            success: true,
            httpStatus: true,
          },
          orderBy: { ts: 'desc' },
          take: 5000,
        }),
        this.prisma.usageMonthly.findMany({ where: { userId } }),
        this.prisma.auditLog.findMany({
          where: { userId },
          select: { id: true, action: true, ts: true, ip: true, userAgent: true, metadata: true },
          orderBy: { ts: 'desc' },
          take: 1000,
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      note:
        'Texts submitted for correction are never stored by AiCorrect. This export only contains account metadata.',
      profile: user,
      sessions,
      apiTokens,
      subscriptions,
      paymentMethods,
      invoices,
      usageEvents: usageEvents.map((e) => ({ ...e, id: e.id.toString() })),
      usageMonthly,
      auditLogs: auditLogs.map((e) => ({ ...e, id: e.id.toString() })),
    };
  }

  /**
   * Soft-deletes the account: sets deletedAt, revokes every session and API
   * token, and asks Stripe to cancel the active subscription at the end of the
   * current period (no mid-cycle refund). Invoices remain linked to the
   * soft-deleted user — French commercial law requires retention.
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Cancel Stripe subscription if any (and if Stripe is configured).
    if (user.stripeCustomerId && this.stripe.isConfigured()) {
      try {
        const stripe = this.stripe.requireClient();
        const subs = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'all',
          limit: 10,
        });
        for (const sub of subs.data) {
          if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
            await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
          }
        }
      } catch (err) {
        this.logger.error(`Failed to cancel Stripe subs for user ${userId}`, err as Error);
        // We still proceed with the local deletion — the customer can also cancel
        // from the billing portal if Stripe is unreachable right now.
      }
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: now } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.apiToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.auditLog.create({ data: { userId, action: 'account.deleted' } }),
    ]);
  }
}

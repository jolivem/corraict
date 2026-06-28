import { Injectable, Logger } from '@nestjs/common';
import type { Stripe } from 'stripe/cjs/stripe.core.js';
import type { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const KNOWN_SUB_STATUSES: SubscriptionStatus[] = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
];

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.upsertSubscription(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.created':
      case 'invoice.finalized':
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await this.upsertInvoice(event.data.object as Stripe.Invoice);
        break;

      case 'payment_method.attached':
      case 'payment_method.updated':
        await this.upsertPaymentMethod(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await this.detachPaymentMethod(event.data.object as Stripe.PaymentMethod);
        break;

      default:
        this.logger.debug(`Ignoring Stripe event: ${event.type}`);
    }
  }

  private async resolveUserIdByCustomer(customerId: string | null | undefined): Promise<string | null> {
    if (!customerId) return null;
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  /**
   * Résout l'utilisateur d'un event Stripe, avec auto-réparation :
   *   1. par `stripeCustomerId` (chemin nominal) ;
   *   2. à défaut, par le `userId` posé dans les metadata Stripe au checkout.
   * Dans le cas 2, on back-fill le `stripeCustomerId` manquant sur le user pour
   * que les prochains events se relient directement par customer. Ça évite que des
   * abonnements restent « orphelins » si un event arrive avant la sauvegarde du
   * customer, ou après une désync customer↔user.
   */
  private async resolveUserId(
    customerId: string | null | undefined,
    fallbackUserId?: string | null,
  ): Promise<string | null> {
    const byCustomer = await this.resolveUserIdByCustomer(customerId);
    if (byCustomer) return byCustomer;

    if (!fallbackUserId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: fallbackUserId },
      select: { id: true, stripeCustomerId: true },
    });
    if (!user) return null;

    if (customerId && user.stripeCustomerId !== customerId) {
      try {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: customerId },
        });
        this.logger.log(`Back-filled stripeCustomerId=${customerId} on user ${user.id} via metadata`);
      } catch (err) {
        // Conflit d'unicité (customer déjà rattaché à un autre user) : on garde le
        // lien logique sans bloquer le traitement de l'event (sinon Stripe retry en boucle).
        this.logger.error(
          `Failed to back-fill stripeCustomerId=${customerId} on user ${user.id}: ${String(err)}`,
        );
      }
    }
    return user.id;
  }

  private async upsertSubscription(sub: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserId(
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      sub.metadata?.userId ?? null,
    );
    if (!userId) {
      this.logger.error(
        `Subscription ${sub.id} has no matching user (customer=${String(sub.customer)}, metadata.userId=${sub.metadata?.userId ?? 'none'})`,
      );
      return;
    }
    const item = sub.items.data[0];
    const plan = item?.price?.lookup_key ?? item?.price?.id ?? 'pro';
    const status = (KNOWN_SUB_STATUSES.includes(sub.status as SubscriptionStatus)
      ? sub.status
      : 'incomplete') as SubscriptionStatus;

    // In recent Stripe API versions the period bounds live on the item, not the subscription.
    const periodStart = item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : new Date();
    const periodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : new Date();

    await this.prisma.subscription.upsert({
      where: { stripeSubId: sub.id },
      create: {
        userId,
        stripeSubId: sub.id,
        plan,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      },
      update: {
        plan,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      },
    });
  }

  private async upsertInvoice(inv: Stripe.Invoice): Promise<void> {
    // Le userId des metadata vit à un endroit qui varie selon la version d'API
    // (subscription_details, parent.subscription_details, ou metadata de la facture).
    // Lecture défensive pour rester robuste aux montées de version.
    const invAny = inv as unknown as {
      subscription_details?: { metadata?: Record<string, string> };
      parent?: { subscription_details?: { metadata?: Record<string, string> } };
    };
    const metadataUserId =
      invAny.subscription_details?.metadata?.userId ??
      invAny.parent?.subscription_details?.metadata?.userId ??
      inv.metadata?.userId ??
      null;

    const userId = await this.resolveUserId(
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? null,
      metadataUserId,
    );
    if (!userId) {
      this.logger.error(`Invoice ${inv.id} has no matching user (customer=${String(inv.customer)})`);
      return;
    }
    const periodStart = inv.lines.data[0]?.period?.start;
    const periodEnd = inv.lines.data[0]?.period?.end;
    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: inv.id },
      create: {
        userId,
        stripeInvoiceId: inv.id,
        amountCents: inv.amount_due,
        currency: inv.currency,
        status: inv.status ?? 'open',
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
        periodStart: periodStart ? new Date(periodStart * 1000) : new Date(),
        periodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
        paidAt: inv.status === 'paid' && inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
          : null,
      },
      update: {
        amountCents: inv.amount_due,
        currency: inv.currency,
        status: inv.status ?? 'open',
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
        paidAt: inv.status === 'paid' && inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
          : null,
      },
    });
  }

  private async upsertPaymentMethod(pm: Stripe.PaymentMethod): Promise<void> {
    const customerId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id ?? null;
    const userId = await this.resolveUserIdByCustomer(customerId);
    if (!userId) {
      // Pas de fallback metadata possible ici (un PaymentMethod ne porte pas de userId).
      if (customerId) this.logger.error(`PaymentMethod ${pm.id} has no matching user (customer=${customerId})`);
      return;
    }
    if (!pm.card) return;
    await this.prisma.paymentMethod.upsert({
      where: { stripePmId: pm.id },
      create: {
        userId,
        stripePmId: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: false,
      },
      update: {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      },
    });
  }

  private async detachPaymentMethod(pm: Stripe.PaymentMethod): Promise<void> {
    await this.prisma.paymentMethod.deleteMany({ where: { stripePmId: pm.id } });
  }
}

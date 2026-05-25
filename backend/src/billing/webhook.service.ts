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

  private async upsertSubscription(sub: Stripe.Subscription): Promise<void> {
    const userId = await this.resolveUserIdByCustomer(
      typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    );
    if (!userId) {
      this.logger.warn(`Subscription ${sub.id} has no matching user (customer=${String(sub.customer)})`);
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
    const userId = await this.resolveUserIdByCustomer(
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.id ?? null,
    );
    if (!userId) {
      this.logger.warn(`Invoice ${inv.id} has no matching user`);
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
    const userId = await this.resolveUserIdByCustomer(
      typeof pm.customer === 'string' ? pm.customer : pm.customer?.id ?? null,
    );
    if (!userId || !pm.card) {
      return;
    }
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

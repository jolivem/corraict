import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { StripeClient } from './stripe.client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeClient,
  ) {}

  /**
   * Lazily creates a Stripe Customer the first time a user starts a checkout
   * or opens the billing portal. The id is persisted on User.stripeCustomerId.
   */
  async ensureCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.requireClient().customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(
    userId: string,
    opts: { successPath?: string; cancelPath?: string },
  ): Promise<{ url: string }> {
    const customerId = await this.ensureCustomer(userId);
    const priceId = this.stripe.requirePriceId();
    const successPath = opts.successPath ?? '/billing/success';
    const cancelPath = opts.cancelPath ?? '/billing/cancel';

    const session = await this.stripe.requireClient().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data:
        this.env.STRIPE_TRIAL_DAYS > 0
          ? { trial_period_days: this.env.STRIPE_TRIAL_DAYS, metadata: { userId } }
          : { metadata: { userId } },
      success_url: `${this.env.PUBLIC_WEB_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.env.PUBLIC_WEB_URL}${cancelPath}`,
      allow_promotion_codes: true,
      client_reference_id: userId,
      metadata: { userId },
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return { url: session.url };
  }

  async createPortalSession(userId: string, returnPath = '/billing'): Promise<{ url: string }> {
    const customerId = await this.ensureCustomer(userId);
    const session = await this.stripe.requireClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.env.PUBLIC_WEB_URL}${returnPath}`,
    });
    return { url: session.url };
  }

  async listInvoices(userId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { periodStart: 'desc' },
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        pdfUrl: true,
        hostedUrl: true,
      },
    });
    return rows;
  }

  async getSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['trialing', 'active', 'past_due'] } },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const paymentMethods = await this.prisma.paymentMethod.findMany({
      where: { userId },
      select: { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true },
    });
    return {
      subscription: sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEnd: sub.trialEnd,
            cancelAt: sub.cancelAt,
            canceledAt: sub.canceledAt,
          }
        : null,
      paymentMethods,
    };
  }
}

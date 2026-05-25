import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import StripeSDK from 'stripe';
// Types from the SDK's namespace aren't re-exported by the CJS entry point in v22,
// so we import them from the core module directly.
import type { Stripe } from 'stripe/cjs/stripe.core.js';
import { loadEnv } from '../config/env';

/**
 * Throw a 503 with a stable code so the web app can show a "billing disabled" UI
 * during early development before Stripe keys are provisioned.
 */
export class BillingNotConfiguredException extends HttpException {
  constructor(missing: string) {
    super({ message: 'billing_not_configured', missing }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

@Injectable()
export class StripeClient {
  private readonly logger = new Logger(StripeClient.name);
  private readonly env = loadEnv();
  private instance: Stripe | null = null;

  isConfigured(): boolean {
    return Boolean(this.env.STRIPE_SECRET_KEY && this.env.STRIPE_PRO_PRICE_ID);
  }

  requireClient(): Stripe {
    if (!this.env.STRIPE_SECRET_KEY) {
      throw new BillingNotConfiguredException('STRIPE_SECRET_KEY');
    }
    if (!this.instance) {
      // Pin the API version so prod responses don't shift under us.
      // Update this in lockstep with the bundled Stripe SDK upgrade.
      this.instance = new StripeSDK(this.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-04-22.dahlia',
      });
    }
    return this.instance;
  }

  requirePriceId(): string {
    if (!this.env.STRIPE_PRO_PRICE_ID) {
      throw new BillingNotConfiguredException('STRIPE_PRO_PRICE_ID');
    }
    return this.env.STRIPE_PRO_PRICE_ID;
  }

  requireWebhookSecret(): string {
    if (!this.env.STRIPE_WEBHOOK_SECRET) {
      throw new BillingNotConfiguredException('STRIPE_WEBHOOK_SECRET');
    }
    return this.env.STRIPE_WEBHOOK_SECRET;
  }
}

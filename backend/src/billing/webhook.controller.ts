import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Stripe } from 'stripe/cjs/stripe.core.js';
import { StripeClient } from './stripe.client';
import { WebhookService } from './webhook.service';

@Controller('billing/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripe: StripeClient,
    private readonly webhook: WebhookService,
  ) {}

  /**
   * Stripe → POST raw JSON with `stripe-signature` header.
   * The raw Buffer is mounted by express.raw() before the JSON parser in main.ts.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request & { body: Buffer | unknown },
  ): Promise<{ received: true }> {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');
    if (!Buffer.isBuffer(req.body)) {
      throw new BadRequestException('Webhook body must be a raw Buffer (check middleware order)');
    }

    const stripe = this.stripe.requireClient();
    const secret = this.stripe.requireWebhookSecret();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, secret);
    } catch (err) {
      this.logger.warn(`Invalid webhook signature: ${(err as Error).message}`);
      throw new BadRequestException('Invalid signature');
    }

    try {
      await this.webhook.handle(event);
    } catch (err) {
      // Returning 500 makes Stripe retry — which is what we want for transient DB errors.
      this.logger.error(`Webhook handler failed for ${event.type}`, err as Error);
      throw err;
    }

    return { received: true };
  }
}

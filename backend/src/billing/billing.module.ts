import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TermsModule } from '../terms/terms.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeClient } from './stripe.client';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [AuthModule, TermsModule],
  controllers: [BillingController, WebhookController],
  providers: [BillingService, StripeClient, WebhookService],
  exports: [StripeClient],
})
export class BillingModule {}

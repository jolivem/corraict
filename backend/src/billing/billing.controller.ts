import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { BillingService } from './billing.service';
import {
  CreateCheckoutSchema,
  type CreateCheckoutDto,
  CreatePortalSchema,
  type CreatePortalDto,
} from './dto/billing.dto';

@Controller('billing')
@UseGuards(SessionGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  async checkout(
    @Body(new ZodValidationPipe(CreateCheckoutSchema)) body: CreateCheckoutDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.billing.createCheckoutSession(user.userId, {
      successPath: body.successPath,
      cancelPath: body.cancelPath,
    });
  }

  @Post('portal')
  @HttpCode(HttpStatus.OK)
  async portal(
    @Body(new ZodValidationPipe(CreatePortalSchema)) body: CreatePortalDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.billing.createPortalSession(user.userId, body.returnPath);
  }

  @Get('subscription')
  async subscription(@CurrentUser() user: AuthPrincipal) {
    return this.billing.getSubscription(user.userId);
  }

  @Get('invoices')
  async invoices(@CurrentUser() user: AuthPrincipal) {
    return this.billing.listInvoices(user.userId);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  AcceptTermsSchema,
  ActiveTermsQuerySchema,
  type AcceptTermsDto,
  type ActiveTermsQuery,
} from './dto/terms.dto';
import { TermsService } from './terms.service';

@Controller('terms')
export class TermsController {
  constructor(private readonly terms: TermsService) {}

  /**
   * Public : utilisé par la page /legal/terms (SSR sans cookie) et par le
   * dialog de checkout. Pas d'auth requise — retourne `null` si aucune
   * version n'est active.
   */
  @Get('active')
  active(@Query(new ZodValidationPipe(ActiveTermsQuerySchema)) query: ActiveTermsQuery) {
    return this.terms.getActive(query.locale);
  }

  /**
   * Status d'acceptation pour l'utilisateur courant. Le front s'en sert pour
   * décider d'afficher le dialog avant Stripe Checkout.
   */
  @Get('status')
  @UseGuards(SessionGuard)
  status(@CurrentUser() user: AuthPrincipal) {
    return this.terms.getStatusFor(user.userId);
  }

  /**
   * Enregistre l'acceptation de la version active. Idempotent côté DB
   * (UNIQUE(userId, termsVersionId)).
   */
  @Post('accept')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async accept(
    @Body(new ZodValidationPipe(AcceptTermsSchema)) body: AcceptTermsDto,
    @CurrentUser() user: AuthPrincipal,
    @Req() req: Request,
  ): Promise<void> {
    await this.terms.accept(user.userId, body.termsVersionId, this.clientIp(req));
  }

  private clientIp(req: Request): string | null {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
    return req.socket.remoteAddress ?? null;
  }
}

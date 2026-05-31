import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTokenGuard } from '../auth/guards/api-token.guard';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { QuotaService } from '../usage/quota.service';
import { CorrectService } from './correct.service';
import { CorrectSchema, type CorrectDto } from './dto/correct.dto';

@Controller('correct')
@UseGuards(ApiTokenGuard)
export class CorrectController {
  constructor(
    private readonly service: CorrectService,
    private readonly quota: QuotaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async correct(
    @Body(new ZodValidationPipe(CorrectSchema)) body: CorrectDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    // Le quota est vérifié AVANT tout appel à Mistral pour éviter de consommer
    // du crédit IA sur des requêtes que l'on va de toute façon facturer 402.
    // Aucune UsageEvent n'est créée si le quota rejette.
    await this.quota.assertCanCorrect(user.userId);

    const apiTokenId = user.kind === 'api-token' ? user.apiTokenId : null;
    return this.service.correct({
      text: body.text,
      language: body.language,
      model: body.model,
      userId: user.userId,
      apiTokenId,
    });
  }
}

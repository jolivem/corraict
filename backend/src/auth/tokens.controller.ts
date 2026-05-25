import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CreateTokenSchema, type CreateTokenDto } from './dto/auth.dto';
import { CurrentUser, type AuthPrincipal } from './decorators/current-user.decorator';
import { SessionGuard } from './guards/session.guard';
import { TokensService } from './tokens.service';

@Controller('auth/tokens')
@UseGuards(SessionGuard)
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateTokenSchema)) body: CreateTokenDto,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.tokens.create(user.userId, body.label);
  }

  @Get()
  list(@CurrentUser() user: AuthPrincipal) {
    return this.tokens.list(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthPrincipal): Promise<void> {
    await this.tokens.revoke(user.userId, id);
  }
}

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { SessionGuard } from './guards/session.guard';
import { ApiTokenGuard } from './guards/api-token.guard';

@Module({
  controllers: [AuthController, TokensController],
  providers: [AuthService, EmailService, TokensService, SessionGuard, ApiTokenGuard],
  exports: [AuthService, TokensService, SessionGuard, ApiTokenGuard],
})
export class AuthModule {}

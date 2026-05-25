import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { loadEnv } from '../config/env';
import { UsersService } from './users.service';

@Controller('users/me')
@UseGuards(SessionGuard)
export class UsersController {
  private readonly env = loadEnv();

  constructor(private readonly users: UsersService) {}

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="aicorrect-export.json"')
  async exportData(@CurrentUser() user: AuthPrincipal) {
    return this.users.exportUser(user.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.users.deleteUser(user.userId);
    // Clear the session cookie so the redirect from the front lands on the
    // public site instead of looping back through the protected dashboard.
    res.clearCookie(this.env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.SESSION_COOKIE_DOMAIN,
      path: '/',
    });
  }
}

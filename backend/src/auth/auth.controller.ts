import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loadEnv } from '../config/env';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
  RequestCodeSchema,
  type RequestCodeDto,
  VerifyCodeSchema,
  type VerifyCodeDto,
} from './dto/auth.dto';
import { SessionGuard } from './guards/session.guard';
import { CurrentUser, type AuthPrincipal } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly env = loadEnv();

  constructor(private readonly auth: AuthService) {}

  @Post('request-code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestCode(
    @Body(new ZodValidationPipe(RequestCodeSchema)) body: RequestCodeDto,
    @Req() req: Request,
  ): Promise<void> {
    await this.auth.requestCode(body.email, this.clientIp(req), body.locale ?? 'fr');
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyCode(
    @Body(new ZodValidationPipe(VerifyCodeSchema)) body: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string; email: string }> {
    const result = await this.auth.verifyCode(body.email, body.code, {
      ip: this.clientIp(req),
      userAgent: req.headers['user-agent'],
    });
    this.setSessionCookie(res, result.sessionToken, result.expiresAt);
    return { userId: result.userId, email: body.email };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[this.env.SESSION_COOKIE_NAME];
    if (token) await this.auth.logout(token);
    this.clearSessionCookie(res);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthPrincipal) {
    return { userId: user.userId, email: 'email' in user ? user.email : undefined };
  }

  private setSessionCookie(res: Response, token: string, expiresAt: Date): void {
    res.cookie(this.env.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.SESSION_COOKIE_DOMAIN,
      expires: expiresAt,
      path: '/',
    });
  }

  private clearSessionCookie(res: Response): void {
    res.clearCookie(this.env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.SESSION_COOKIE_DOMAIN,
      path: '/',
    });
  }

  private clientIp(req: Request): string | undefined {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
    return req.socket.remoteAddress ?? undefined;
  }
}

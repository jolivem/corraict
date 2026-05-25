import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { loadEnv } from '../../config/env';
import { AuthService } from '../auth.service';
import type { AuthPrincipal } from '../decorators/current-user.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly env = loadEnv();
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { auth?: AuthPrincipal; cookies?: Record<string, string> }>();
    const token = req.cookies?.[this.env.SESSION_COOKIE_NAME];
    if (!token) throw new UnauthorizedException('Missing session');
    const session = await this.auth.resolveSession(token);
    if (!session) throw new UnauthorizedException('Invalid or expired session');
    req.auth = { kind: 'session', ...session };
    return true;
  }
}

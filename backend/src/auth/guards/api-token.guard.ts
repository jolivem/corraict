import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokensService } from '../tokens.service';
import type { AuthPrincipal } from '../decorators/current-user.decorator';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { auth?: AuthPrincipal }>();
    const header = req.headers['authorization'];
    if (typeof header !== 'string' || !header.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const raw = header.slice(7).trim();
    const resolved = await this.tokens.resolveBearer(raw);
    if (!resolved) throw new UnauthorizedException('Invalid or revoked token');
    req.auth = { kind: 'api-token', ...resolved };
    return true;
  }
}

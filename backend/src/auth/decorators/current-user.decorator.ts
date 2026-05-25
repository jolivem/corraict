import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SessionContext } from '../auth.service';
import type { ApiTokenContext } from '../tokens.service';

export type AuthPrincipal =
  | ({ kind: 'session' } & SessionContext)
  | ({ kind: 'api-token' } & ApiTokenContext);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const req = ctx.switchToHttp().getRequest<Request & { auth?: AuthPrincipal }>();
    if (!req.auth) {
      throw new Error('CurrentUser used on an unauthenticated route');
    }
    return req.auth;
  },
);

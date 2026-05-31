import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthPrincipal } from '../../auth/decorators/current-user.decorator';

/**
 * Guard à composer APRÈS SessionGuard. Recharge `user.role` depuis la DB et
 * exige `ADMIN`. Pattern : `@UseGuards(SessionGuard, AdminGuard)`.
 *
 * Volontairement basé sur la session web (cookie), pas sur un API token —
 * les actions admin ne doivent pas être déclenchables depuis le clavier Android.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { auth?: AuthPrincipal }>();
    const auth = req.auth;
    if (!auth || auth.kind !== 'session') {
      throw new ForbiddenException('Admin actions require a session');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }
    return true;
  }
}

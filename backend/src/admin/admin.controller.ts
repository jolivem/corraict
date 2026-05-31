import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import {
  ListUsersQuerySchema,
  type ListUsersQuery,
  UpdatePlanSchema,
  type UpdatePlanDto,
  UpdateQuotaSchema,
  type UpdateQuotaDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  list(@Query(new ZodValidationPipe(ListUsersQuerySchema)) query: ListUsersQuery) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  detail(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(
    @Param('id') id: string,
    @CurrentUser() actor: AuthPrincipal,
    @Req() req: Request,
  ): Promise<void> {
    await this.admin.suspend(id, actor.userId, this.clientIp(req));
  }

  @Post('users/:id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(
    @Param('id') id: string,
    @CurrentUser() actor: AuthPrincipal,
    @Req() req: Request,
  ): Promise<void> {
    await this.admin.reactivate(id, actor.userId, this.clientIp(req));
  }

  @Patch('users/:id/plan')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setPlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlanSchema)) body: UpdatePlanDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() req: Request,
  ): Promise<void> {
    await this.admin.setPlan(id, body.plan, actor.userId, this.clientIp(req));
  }

  @Patch('users/:id/quota')
  @HttpCode(HttpStatus.NO_CONTENT)
  async setQuota(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateQuotaSchema)) body: UpdateQuotaDto,
    @CurrentUser() actor: AuthPrincipal,
    @Req() req: Request,
  ): Promise<void> {
    await this.admin.setQuota(id, body.monthlyRequestQuota, actor.userId, this.clientIp(req));
  }

  private clientIp(req: Request): string | null {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
    return req.socket.remoteAddress ?? null;
  }
}

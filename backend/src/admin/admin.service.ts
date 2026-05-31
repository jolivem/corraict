import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { UsageRetentionService, type UsageRetentionStats } from '../usage/usage-retention.service';
import type { ListUsersQuery } from './dto/admin.dto';

export interface AdminUserListItem {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO';
  monthlyRequestQuota: number | null;
  suspendedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  requestsThisMonth: number;
  hasActiveSubscription: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
  locale: string;
  stripeCustomerId: string | null;
  effectiveQuota: number | null; // null si PRO/ADMIN/sub active = illimité
  usageMonthly: Array<{ yearMonth: string; requests: number; words: number }>;
  subscriptions: Array<{
    id: string;
    stripeSubId: string;
    plan: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAt: Date | null;
    canceledAt: Date | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    ip: string | null;
    ts: Date;
    metadata: unknown;
  }>;
}

@Injectable()
export class AdminService {
  private readonly env = loadEnv();

  constructor(
    private readonly prisma: PrismaService,
    private readonly retention: UsageRetentionService,
  ) {}

  // ─── Stats opérationnelles ───────────────────────────────────────────────

  getUsageStats(): Promise<UsageRetentionStats> {
    return this.retention.getStats();
  }

  // ─── Listing ─────────────────────────────────────────────────────────────

  async listUsers(query: ListUsersQuery): Promise<{
    items: AdminUserListItem[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.UserWhereInput = {};
    if (query.q) {
      where.email = { contains: query.q.toLowerCase() };
    }
    switch (query.status) {
      case 'active':
        where.suspendedAt = null;
        where.deletedAt = null;
        break;
      case 'suspended':
        where.suspendedAt = { not: null };
        break;
      case 'deleted':
        where.deletedAt = { not: null };
        break;
      // 'all' : pas de filtre
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          email: true,
          role: true,
          plan: true,
          monthlyRequestQuota: true,
          suspendedAt: true,
          deletedAt: true,
          createdAt: true,
        },
      }),
    ]);

    if (users.length === 0) {
      return { items: [], total, page: query.page, limit: query.limit };
    }

    const yearMonth = this.currentYearMonth();
    const userIds = users.map((u) => u.id);
    const [monthly, activeSubs] = await this.prisma.$transaction([
      this.prisma.usageMonthly.findMany({
        where: { userId: { in: userIds }, yearMonth },
        select: { userId: true, requests: true },
      }),
      this.prisma.subscription.findMany({
        where: { userId: { in: userIds }, status: { in: ['trialing', 'active'] } },
        select: { userId: true },
      }),
    ]);
    const monthlyByUser = new Map(monthly.map((m) => [m.userId, m.requests]));
    const activeSubUserIds = new Set(activeSubs.map((s) => s.userId));

    return {
      items: users.map((u) => ({
        ...u,
        requestsThisMonth: monthlyByUser.get(u.id) ?? 0,
        hasActiveSubscription: activeSubUserIds.has(u.id),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  // ─── Détail ──────────────────────────────────────────────────────────────

  async getUserDetail(id: string): Promise<AdminUserDetail> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // 6 derniers mois (UTC) en chaînes YYYY-MM, pour requête bornée.
    const months = this.lastNMonths(6);
    const [usageMonthly, subscriptions, recentAuditLogs, activeSub] =
      await this.prisma.$transaction([
        this.prisma.usageMonthly.findMany({
          where: { userId: id, yearMonth: { in: months } },
          orderBy: { yearMonth: 'desc' },
          select: { yearMonth: true, requests: true, words: true },
        }),
        this.prisma.subscription.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            stripeSubId: true,
            plan: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAt: true,
            canceledAt: true,
          },
        }),
        this.prisma.auditLog.findMany({
          where: { userId: id },
          orderBy: { ts: 'desc' },
          take: 30,
          select: { id: true, action: true, ip: true, ts: true, metadata: true },
        }),
        this.prisma.subscription.findFirst({
          where: { userId: id, status: { in: ['trialing', 'active'] } },
          select: { id: true },
        }),
      ]);

    const hasActiveSubscription = activeSub !== null;
    const isUnlimited = user.role === 'ADMIN' || hasActiveSubscription;
    const effectiveQuota = isUnlimited
      ? null
      : (user.monthlyRequestQuota ?? this.env.FREE_TIER_MONTHLY_QUOTA);

    const currentMonth = this.currentYearMonth();
    const requestsThisMonth =
      usageMonthly.find((m) => m.yearMonth === currentMonth)?.requests ?? 0;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      monthlyRequestQuota: user.monthlyRequestQuota,
      suspendedAt: user.suspendedAt,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      locale: user.locale,
      stripeCustomerId: user.stripeCustomerId,
      requestsThisMonth,
      hasActiveSubscription,
      effectiveQuota,
      usageMonthly,
      subscriptions,
      recentAuditLogs: recentAuditLogs.map((l) => ({
        id: l.id.toString(),
        action: l.action,
        ip: l.ip,
        ts: l.ts,
        metadata: l.metadata,
      })),
    };
  }

  // ─── Actions (toutes auditées) ───────────────────────────────────────────

  async suspend(targetUserId: string, actorUserId: string, ip: string | null): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { suspendedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'admin.user.suspend',
          ip,
          metadata: { targetUserId },
        },
      }),
    ]);
  }

  async reactivate(targetUserId: string, actorUserId: string, ip: string | null): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { suspendedAt: null },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'admin.user.reactivate',
          ip,
          metadata: { targetUserId },
        },
      }),
    ]);
  }

  async setPlan(
    targetUserId: string,
    plan: 'FREE' | 'PRO',
    actorUserId: string,
    ip: string | null,
  ): Promise<void> {
    const before = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { plan: true },
    });
    if (!before) throw new NotFoundException('User not found');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetUserId }, data: { plan } }),
      this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'admin.user.plan.change',
          ip,
          metadata: { targetUserId, from: before.plan, to: plan },
        },
      }),
    ]);
  }

  async setQuota(
    targetUserId: string,
    monthlyRequestQuota: number | null,
    actorUserId: string,
    ip: string | null,
  ): Promise<void> {
    const before = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { monthlyRequestQuota: true },
    });
    if (!before) throw new NotFoundException('User not found');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { monthlyRequestQuota },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'admin.user.quota.override',
          ip,
          metadata: {
            targetUserId,
            from: before.monthlyRequestQuota,
            to: monthlyRequestQuota,
          },
        },
      }),
    ]);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private currentYearMonth(): string {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private lastNMonths(n: number): string[] {
    const out: string[] = [];
    const d = new Date();
    for (let i = 0; i < n; i++) {
      const cur = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
      out.push(
        `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}`,
      );
    }
    return out;
  }
}

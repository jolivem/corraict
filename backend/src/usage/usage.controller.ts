import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthPrincipal } from '../auth/decorators/current-user.decorator';
import { SessionGuard } from '../auth/guards/session.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('usage')
@UseGuards(SessionGuard)
export class UsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async summary(@CurrentUser() user: AuthPrincipal) {
    const yearMonth = this.yearMonth(new Date());
    const rows = await this.prisma.usageMonthly.findMany({
      where: { userId: user.userId },
      orderBy: { yearMonth: 'desc' },
      take: 6,
      select: { yearMonth: true, requests: true, words: true },
    });
    const currentRow = rows.find((r) => r.yearMonth === yearMonth);
    return {
      currentMonth: {
        yearMonth,
        requests: currentRow?.requests ?? 0,
        words: currentRow?.words ?? 0,
      },
      recentMonths: rows,
    };
  }

  private yearMonth(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
}

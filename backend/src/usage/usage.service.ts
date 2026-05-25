import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageEventInput {
  userId: string;
  apiTokenId: string | null;
  wordsIn: number;
  charsIn: number;
  model: string;
  latencyMs: number;
  success: boolean;
  httpStatus: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(evt: UsageEventInput): Promise<void> {
    const yearMonth = this.yearMonth(new Date());
    try {
      await this.prisma.$transaction([
        this.prisma.usageEvent.create({ data: evt }),
        this.prisma.usageMonthly.upsert({
          where: { userId_yearMonth: { userId: evt.userId, yearMonth } },
          create: {
            userId: evt.userId,
            yearMonth,
            requests: evt.success ? 1 : 0,
            words: evt.success ? evt.wordsIn : 0,
          },
          update: evt.success
            ? { requests: { increment: 1 }, words: { increment: evt.wordsIn } }
            : {},
        }),
      ]);
    } catch (err) {
      // Tracking failure must never break the user flow; log and move on.
      this.logger.error('Failed to record usage event', err as Error);
    }
  }

  private yearMonth(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
}

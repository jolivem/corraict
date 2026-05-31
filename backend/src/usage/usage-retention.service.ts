import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { loadEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageRetentionStats {
  totalEvents: number;
  oldestTs: string | null;
  retentionDays: number;
  lastPurgeTs: string | null;
  lastPurgeDeleted: number | null;
}

interface LastPurgeMeta {
  ts: string;
  deleted: number;
  cutoff: string;
}

const META_KEY = 'lastUsageEventPurge';

/**
 * Purge quotidienne des `UsageEvent` plus anciens que `USAGE_EVENT_RETENTION_DAYS`.
 *
 * `UsageMonthly` (agrégats) n'est jamais purgé — les chiffres restent visibles
 * pour toujours dans le dashboard utilisateur et /admin. Seuls les rows bruts
 * disparaissent au-delà de la fenêtre de rétention.
 *
 * Cron : tous les jours à 03:00 UTC (heure creuse).
 */
@Injectable()
export class UsageRetentionService {
  private readonly logger = new Logger(UsageRetentionService.name);
  private readonly env = loadEnv();

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge(): Promise<void> {
    const retentionDays = this.env.USAGE_EVENT_RETENTION_DAYS;
    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);
    try {
      const result = await this.prisma.usageEvent.deleteMany({
        where: { ts: { lt: cutoff } },
      });
      const meta: LastPurgeMeta = {
        ts: new Date().toISOString(),
        deleted: result.count,
        cutoff: cutoff.toISOString(),
      };
      await this.prisma.opsMeta.upsert({
        where: { key: META_KEY },
        create: { key: META_KEY, value: JSON.stringify(meta) },
        update: { value: JSON.stringify(meta) },
      });
      this.logger.log(
        `UsageEvent purge: deleted ${result.count} rows older than ${cutoff.toISOString()} (retention=${retentionDays}d)`,
      );
    } catch (err) {
      // Ne jamais crash le scheduler : on log et on retentera demain.
      this.logger.error('UsageEvent purge failed', err as Error);
    }
  }

  async getStats(): Promise<UsageRetentionStats> {
    const [totalEvents, oldest, meta] = await this.prisma.$transaction([
      this.prisma.usageEvent.count(),
      this.prisma.usageEvent.findFirst({
        orderBy: { ts: 'asc' },
        select: { ts: true },
      }),
      this.prisma.opsMeta.findUnique({ where: { key: META_KEY } }),
    ]);

    let lastPurgeTs: string | null = null;
    let lastPurgeDeleted: number | null = null;
    if (meta?.value) {
      try {
        const parsed = JSON.parse(meta.value) as LastPurgeMeta;
        lastPurgeTs = parsed.ts ?? null;
        lastPurgeDeleted = typeof parsed.deleted === 'number' ? parsed.deleted : null;
      } catch {
        // Valeur corrompue — on l'ignore, le prochain run la réécrira proprement.
      }
    }

    return {
      totalEvents,
      oldestTs: oldest?.ts?.toISOString() ?? null,
      retentionDays: this.env.USAGE_EVENT_RETENTION_DAYS,
      lastPurgeTs,
      lastPurgeDeleted,
    };
  }
}

import { getFormatter, getTranslations } from 'next-intl/server';
import type { UsageSummary } from '@/lib/types';

export async function UsageCard({
  usage,
  quotaLimit,
}: {
  usage: UsageSummary | null;
  quotaLimit: number | null;
}) {
  const t = await getTranslations('Dashboard');
  const format = await getFormatter();

  function formatMonth(yearMonth: string): string {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
    return format.dateTime(d, { month: 'long', year: 'numeric' });
  }

  const current = usage?.currentMonth;
  const history = usage?.recentMonths ?? [];

  // Aucune correction enregistrée → on masque entièrement la carte Utilisation.
  if (!current || (current.requests === 0 && history.length === 0)) {
    return null;
  }

  const maxRequests = Math.max(1, ...history.map((m) => m.requests));
  const used = current.requests;
  const pct = quotaLimit ? Math.min(100, Math.round((used / quotaLimit) * 100)) : 0;
  const nearLimit = quotaLimit !== null && pct >= 80;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('usageTitle')}</h2>
      <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              {t('usageCurrentMonth')} · {formatMonth(current.yearMonth)}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {quotaLimit
                ? t('usageQuotaCount', { used, quota: quotaLimit })
                : t('usageRequests', { count: current.requests })}
            </p>
            <p className="text-sm text-body">
              {t('usageWords', { count: current.words })}
            </p>
            {quotaLimit && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-surface-muted">
                <div
                  className={`h-full rounded ${nearLimit ? 'bg-amber-500' : 'bg-brand-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {nearLimit && (
              <p className="mt-2 text-xs text-amber-700">{t('usageQuotaNearLimit')}</p>
            )}
          </div>
          {history.length > 1 && (
            <div className="mt-6">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                {t('usageHistory')}
              </p>
              <ul className="space-y-2">
                {[...history].reverse().map((m) => (
                  <li key={m.yearMonth} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-muted">
                      {formatMonth(m.yearMonth)}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-surface-muted">
                      <div
                        className="h-full rounded bg-brand-500"
                        style={{ width: `${Math.round((m.requests / maxRequests) * 100)}%` }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-sm tabular-nums text-body">
                      {m.requests}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
    </section>
  );
}

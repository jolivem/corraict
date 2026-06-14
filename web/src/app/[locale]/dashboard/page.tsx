import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type {
  ApiTokenDto,
  InvoiceDto,
  MeDto,
  SubscriptionPayload,
  SubscriptionStatus,
  UsageSummary,
} from '@/lib/types';
import { BillingActions } from './BillingActions';
import { TokensSection } from './TokensSection';
import { DataSection } from './DataSection';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await serverGet<MeDto>('/v1/auth/me');
  if (!me) {
    redirect({ href: '/login', locale });
  }

  const [usage, subscription, tokens, invoices] = await Promise.all([
    serverGet<UsageSummary>('/v1/usage'),
    serverGet<SubscriptionPayload>('/v1/billing/subscription'),
    serverGet<ApiTokenDto[]>('/v1/auth/tokens'),
    serverGet<InvoiceDto[]>('/v1/billing/invoices'),
  ]);

  // Il n'y a plus de palier gratuit : l'accès au correcteur nécessite un
  // abonnement. On n'affiche donc jamais de barre de quota — un utilisateur
  // sans abonnement voit l'invite « S'abonner » dans la carte Abonnement.
  // (La barre reste prête côté UsageCard pour un futur quota premium.)
  const hasActiveSub = (subscription?.subscription?.status ?? '') === 'active' ||
    (subscription?.subscription?.status ?? '') === 'trialing';
  const isAdmin = me?.role === 'ADMIN';
  const isComplimentaryPro = me?.plan === 'PRO' && !hasActiveSub;
  const quotaLimit: number | null = null;

  const t = await getTranslations('Dashboard');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('welcome', { email: me?.email ?? '' })}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {t('adminLink')}
            </Link>
          </div>
        )}
      </header>

      <UsageCard usage={usage} quotaLimit={quotaLimit} />

      <SubscriptionCard subscription={subscription} isComplimentaryPro={isComplimentaryPro} />

      <TokensSection initialTokens={tokens ?? []} />

      <InvoicesCard invoices={invoices ?? []} />

      <DataSection />
    </div>
  );

  function formatMonth(yearMonth: string): string {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
    return format.dateTime(d, { month: 'long', year: 'numeric' });
  }

  function UsageCard({
    usage,
    quotaLimit,
  }: {
    usage: UsageSummary | null;
    quotaLimit: number | null;
  }) {
    const current = usage?.currentMonth;
    const history = usage?.recentMonths ?? [];
    const maxRequests = Math.max(1, ...history.map((m) => m.requests));
    const used = current?.requests ?? 0;
    const pct = quotaLimit ? Math.min(100, Math.round((used / quotaLimit) * 100)) : 0;
    const nearLimit = quotaLimit !== null && pct >= 80;

    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('usageTitle')}</h2>
        {!current || (current.requests === 0 && history.length === 0) ? (
          <div className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
            {t('usageEmpty')}
          </div>
        ) : (
          <>
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
          </>
        )}
      </section>
    );
  }

  function SubscriptionCard({
    subscription,
    isComplimentaryPro,
  }: {
    subscription: SubscriptionPayload | null;
    isComplimentaryPro: boolean;
  }) {
    const sub = subscription?.subscription ?? null;
    const statusKey = (sub?.status ?? '') as SubscriptionStatus;
    const statusLabels: Record<SubscriptionStatus, string> = {
      trialing: t('subscriptionStatus_trialing'),
      active: t('subscriptionStatus_active'),
      past_due: t('subscriptionStatus_past_due'),
      canceled: t('subscriptionStatus_canceled'),
      incomplete: t('subscriptionStatus_incomplete'),
      incomplete_expired: t('subscriptionStatus_incomplete_expired'),
      unpaid: t('subscriptionStatus_unpaid'),
      paused: t('subscriptionStatus_paused'),
    };

    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('subscriptionTitle')}</h2>
        {!sub && isComplimentaryPro ? (
          <div className="mt-3 rounded-lg border border-success/30 bg-success-bg px-4 py-3">
            <p className="flex items-center gap-2 text-base font-semibold text-success">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4 12.5 9 17.5 20 6.5" />
              </svg>
              {t('subscriptionComplimentaryTitle')}
            </p>
            <p className="mt-1 text-sm text-success-text">{t('subscriptionComplimentaryBody')}</p>
          </div>
        ) : !sub ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-body">{t('subscriptionNone')}</p>
            <BillingActions
              hasSubscription={false}
              unavailableLabel={t('subscriptionUnavailable')}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm text-body">
              <p>
                <span className="text-muted">{t('subscriptionPlan')} : </span>
                <span className="font-medium text-ink">{sub.plan}</span>
              </p>
              <p className="mt-1">
                <span className="text-muted">{t('subscriptionStatus')} : </span>
                <span className="font-medium text-ink">{statusLabels[statusKey] ?? statusKey}</span>
              </p>
              {sub.trialEnd && sub.status === 'trialing' && (
                <p className="mt-2 text-muted">
                  {t('subscriptionTrialEnds', {
                    date: format.dateTime(new Date(sub.trialEnd), { dateStyle: 'medium' }),
                  })}
                </p>
              )}
              {sub.cancelAt && (
                <p className="mt-2 text-amber-700">
                  {t('subscriptionCancelAt', {
                    date: format.dateTime(new Date(sub.cancelAt), { dateStyle: 'medium' }),
                  })}
                </p>
              )}
              {!sub.cancelAt && sub.status === 'active' && (
                <p className="mt-2 text-muted">
                  {t('subscriptionRenewsOn', {
                    date: format.dateTime(new Date(sub.currentPeriodEnd), { dateStyle: 'medium' }),
                  })}
                </p>
              )}
            </div>
            <BillingActions
              hasSubscription={true}
              unavailableLabel={t('subscriptionUnavailable')}
            />
          </div>
        )}
      </section>
    );
  }

  function InvoicesCard({ invoices }: { invoices: InvoiceDto[] }) {
    const statusLabel = (status: string): string => {
      const key = `invoiceStatus_${status}` as const;
      // Translation keys are pre-declared; fall back to raw status if missing.
      try {
        return t(key);
      } catch {
        return status;
      }
    };

    return (
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('invoicesTitle')}</h2>
        {invoices.length === 0 ? (
          <div className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
            {t('invoicesEmpty')}
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="text-sm">
                  <p className="font-medium text-ink">
                    {format.number(inv.amountCents / 100, {
                      style: 'currency',
                      currency: inv.currency.toUpperCase(),
                    })}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {statusLabel(inv.status)}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {format.dateTime(new Date(inv.periodStart), { dateStyle: 'medium' })}
                    {' → '}
                    {format.dateTime(new Date(inv.periodEnd), { dateStyle: 'medium' })}
                  </p>
                </div>
                {(inv.pdfUrl ?? inv.hostedUrl) && (
                  <a
                    href={inv.pdfUrl ?? inv.hostedUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-700 hover:underline"
                  >
                    {t('invoicesDownload')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
}

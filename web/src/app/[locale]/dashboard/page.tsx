import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type {
  ApiTokenDto,
  InvoiceDto,
  MeDto,
  SubscriptionPayload,
  SubscriptionStatus,
  UsageSummary,
} from '@/lib/types';
import { LogoutButton } from './LogoutButton';
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

  const t = await getTranslations('Dashboard');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('welcome', { email: me?.email ?? '' })}</p>
        </div>
        <LogoutButton />
      </header>

      <UsageCard usage={usage} />

      <SubscriptionCard subscription={subscription} />

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

  function UsageCard({ usage }: { usage: UsageSummary | null }) {
    const current = usage?.currentMonth;
    const history = usage?.recentMonths ?? [];
    const maxRequests = Math.max(1, ...history.map((m) => m.requests));

    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('usageTitle')}</h2>
        {!current || (current.requests === 0 && history.length === 0) ? (
          <p className="mt-4 text-sm text-gray-500">{t('usageEmpty')}</p>
        ) : (
          <>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {t('usageCurrentMonth')} · {formatMonth(current.yearMonth)}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {t('usageRequests', { count: current.requests })}
              </p>
              <p className="text-sm text-gray-600">
                {t('usageWords', { count: current.words })}
              </p>
            </div>
            {history.length > 1 && (
              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                  {t('usageHistory')}
                </p>
                <ul className="space-y-2">
                  {[...history].reverse().map((m) => (
                    <li key={m.yearMonth} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm text-gray-600">
                        {formatMonth(m.yearMonth)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded bg-gray-100">
                        <div
                          className="h-full rounded bg-brand-500"
                          style={{ width: `${Math.round((m.requests / maxRequests) * 100)}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-gray-700">
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

  function SubscriptionCard({ subscription }: { subscription: SubscriptionPayload | null }) {
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
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('subscriptionTitle')}</h2>
        {!sub ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">{t('subscriptionNone')}</p>
            <BillingActions
              hasSubscription={false}
              unavailableLabel={t('subscriptionUnavailable')}
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm text-gray-700">
              <p>
                <span className="text-gray-500">{t('subscriptionPlan')} : </span>
                <span className="font-medium text-gray-900">{sub.plan}</span>
              </p>
              <p className="mt-1">
                <span className="text-gray-500">{t('subscriptionStatus')} : </span>
                <span className="font-medium text-gray-900">{statusLabels[statusKey] ?? statusKey}</span>
              </p>
              {sub.trialEnd && sub.status === 'trialing' && (
                <p className="mt-2 text-gray-600">
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
                <p className="mt-2 text-gray-600">
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
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('invoicesTitle')}</h2>
        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{t('invoicesEmpty')}</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {format.number(inv.amountCents / 100, {
                      style: 'currency',
                      currency: inv.currency.toUpperCase(),
                    })}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {statusLabel(inv.status)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
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

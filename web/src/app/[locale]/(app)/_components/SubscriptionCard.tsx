import { getFormatter, getTranslations } from 'next-intl/server';
import type { SubscriptionPayload, SubscriptionStatus } from '@/lib/types';
import { BillingActions } from '../BillingActions';

export async function SubscriptionCard({
  subscription,
  isComplimentaryPro,
  title,
  showCancelLink = false,
}: {
  subscription: SubscriptionPayload | null;
  isComplimentaryPro: boolean;
  title?: string;
  showCancelLink?: boolean;
}) {
  const t = await getTranslations('Dashboard');
  const format = await getFormatter();

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

  const cancelLabel = showCancelLink ? t('subscriptionCancel') : undefined;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{title ?? t('subscriptionTitle')}</h2>
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
            cancelLabel={cancelLabel}
          />
        </div>
      )}
    </section>
  );
}

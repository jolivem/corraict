import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { AdminUserDetail, MeDto } from '@/lib/types';
import { AdminActions } from '../AdminActions';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const me = await serverGet<MeDto>('/v1/auth/me');
  if (!me) {
    redirect({ href: '/login', locale });
    return null;
  }
  if (me.role !== 'ADMIN') {
    redirect({ href: '/dashboard', locale });
    return null;
  }

  const user = await serverGet<AdminUserDetail>(`/v1/admin/users/${id}`);
  if (!user) notFound();

  const t = await getTranslations('Admin');
  const format = await getFormatter();

  function formatMonth(yearMonth: string): string {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
    return format.dateTime(d, { month: 'long', year: 'numeric' });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-brand-700 hover:underline">
            ← {t('backToList')}
          </Link>
          <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold text-gray-900">
            <span>{user.email}</span>
            {user.isComplimentaryPro && (
              <span
                className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                title={t('complimentaryProTooltip')}
              >
                {t('complimentaryProBadge')}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('detailCreated', {
              date: format.dateTime(new Date(user.createdAt), { dateStyle: 'medium' }),
            })}
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label={t('fieldRole')} value={user.role} />
        <Field label={t('fieldPlan')} value={user.plan === 'PRO' ? t('planPro') : t('planFree')} />
        <Field
          label={t('fieldEffectiveQuota')}
          value={user.effectiveQuota === null ? t('quotaUnlimited') : String(user.effectiveQuota)}
        />
        <Field
          label={t('fieldQuotaOverride')}
          value={user.monthlyRequestQuota === null ? t('quotaInherit') : String(user.monthlyRequestQuota)}
        />
        <Field label={t('fieldLocale')} value={user.locale} />
        <Field
          label={t('fieldStripeCustomer')}
          value={user.stripeCustomerId ?? '—'}
        />
        <Field
          label={t('fieldRequestsThisMonth')}
          value={String(user.requestsThisMonth)}
        />
        <Field
          label={t('fieldStatus')}
          value={
            user.deletedAt
              ? t('statusDeleted')
              : user.suspendedAt
                ? t('statusSuspended')
                : t('statusActive')
          }
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('actionsTitle')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('actionsHint')}</p>
        <div className="mt-4">
          <AdminActions
            userId={user.id}
            email={user.email}
            isSelf={me.userId === user.id}
            suspendedAt={user.suspendedAt}
            currentPlan={user.plan}
            currentQuotaOverride={user.monthlyRequestQuota}
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('usageHistoryTitle')}</h2>
        {user.usageMonthly.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t('usageEmpty')}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {user.usageMonthly.map((m) => (
              <li key={m.yearMonth} className="flex items-baseline justify-between">
                <span className="text-gray-600">{formatMonth(m.yearMonth)}</span>
                <span className="tabular-nums text-gray-900">
                  {t('usageLine', { requests: m.requests, words: m.words })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('subscriptionsTitle')}</h2>
        {user.subscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t('noSubscription')}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {user.subscriptions.map((s) => (
              <li key={s.id} className="rounded border border-gray-100 p-3">
                <p className="font-medium text-gray-900">
                  {s.status}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {format.dateTime(new Date(s.currentPeriodStart), { dateStyle: 'medium' })}
                  {' → '}
                  {format.dateTime(new Date(s.currentPeriodEnd), { dateStyle: 'medium' })}
                </p>
                <p className="mt-1 text-xs text-gray-400">stripe: {s.stripeSubId}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('auditTitle')}</h2>
        {user.recentAuditLogs.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t('auditEmpty')}</p>
        ) : (
          <ul className="mt-4 space-y-1 text-xs text-gray-700">
            {user.recentAuditLogs.map((log) => (
              <li key={log.id} className="flex items-baseline gap-3">
                <span className="w-44 shrink-0 tabular-nums text-gray-500">
                  {format.dateTime(new Date(log.ts), { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className="font-mono">{log.action}</span>
                {log.ip && <span className="text-gray-400">· {log.ip}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

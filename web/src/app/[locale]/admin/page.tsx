import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { AdminUserListResponse, MeDto, UsageRetentionStats } from '@/lib/types';

type SearchParams = Promise<{ q?: string; page?: string; status?: string }>;

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
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

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const page = Math.max(1, Number(sp.page ?? '1') || 1);
  const status = ['all', 'live', 'active', 'suspended', 'deleted'].includes(sp.status ?? '')
    ? (sp.status as 'all' | 'live' | 'active' | 'suspended' | 'deleted')
    : 'live';

  const qs = new URLSearchParams({ page: String(page), status });
  if (q) qs.set('q', q);
  const [list, stats] = await Promise.all([
    serverGet<AdminUserListResponse>(`/v1/admin/users?${qs.toString()}`),
    serverGet<UsageRetentionStats>('/v1/admin/usage/stats'),
  ]);

  const t = await getTranslations('Admin');
  const format = await getFormatter();

  const items = list?.items ?? [];
  const total = list?.total ?? 0;
  const limit = list?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('subtitle', { total })}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/terms" className="text-sm font-medium text-brand-700 hover:underline">
            {t('termsLink')}
          </Link>
          <Link href="/dashboard" className="text-sm text-brand-700 hover:underline">
            {t('backToDashboard')}
          </Link>
        </div>
      </header>

      {stats && (
        <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span>
              <span className="text-gray-500">{t('retentionTotal')} :</span>{' '}
              <span className="font-medium text-gray-900 tabular-nums">{stats.totalEvents}</span>
            </span>
            <span>
              <span className="text-gray-500">{t('retentionOldest')} :</span>{' '}
              <span className="font-medium text-gray-900">
                {stats.oldestTs
                  ? format.dateTime(new Date(stats.oldestTs), { dateStyle: 'medium' })
                  : '—'}
              </span>
            </span>
            <span>
              <span className="text-gray-500">{t('retentionWindow')} :</span>{' '}
              <span className="font-medium text-gray-900 tabular-nums">
                {t('retentionDays', { days: stats.retentionDays })}
              </span>
            </span>
            <span>
              <span className="text-gray-500">{t('retentionLastPurge')} :</span>{' '}
              <span className="font-medium text-gray-900">
                {stats.lastPurgeTs
                  ? `${format.dateTime(new Date(stats.lastPurgeTs), { dateStyle: 'short', timeStyle: 'short' })} (${stats.lastPurgeDeleted ?? 0})`
                  : t('retentionNeverRun')}
              </span>
            </span>
          </div>
        </section>
      )}

      <form className="flex flex-wrap gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder={t('searchPlaceholder')}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="live">{t('statusLive')}</option>
          <option value="active">{t('statusActive')}</option>
          <option value="suspended">{t('statusSuspended')}</option>
          <option value="deleted">{t('statusDeleted')}</option>
          <option value="all">{t('statusAll')}</option>
        </select>
        <button
          type="submit"
          className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('searchSubmit')}
        </button>
      </form>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">{t('colEmail')}</th>
              <th className="px-4 py-2">{t('colRole')}</th>
              <th className="px-4 py-2">{t('colPlan')}</th>
              <th className="px-4 py-2 text-right">{t('colUsage')}</th>
              <th className="px-4 py-2">{t('colStatus')}</th>
              <th className="px-4 py-2">{t('colCreated')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    <Link
                      href={`/admin/${u.id}`}
                      className="hover:underline"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2">
                    <PlanBadge plan={u.plan} hasActiveSub={u.hasActiveSubscription} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {u.requestsThisMonth}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      suspendedAt={u.suspendedAt}
                      deletedAt={u.deletedAt}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {format.dateTime(new Date(u.createdAt), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams({ page: String(p), status });
            if (q) params.set('q', q);
            return (
              <Link
                key={p}
                href={`/admin?${params.toString()}`}
                className={`rounded px-3 py-1 text-sm ${
                  p === page
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );

  function RoleBadge({ role }: { role: 'USER' | 'ADMIN' }) {
    return role === 'ADMIN' ? (
      <span className="inline-flex rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
        {t('roleAdmin')}
      </span>
    ) : (
      <span className="text-xs text-gray-500">{t('roleUser')}</span>
    );
  }

  function PlanBadge({ plan, hasActiveSub }: { plan: 'FREE' | 'PRO'; hasActiveSub: boolean }) {
    if (hasActiveSub || plan === 'PRO') {
      return (
        <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
          {t('planPro')}
        </span>
      );
    }
    return <span className="text-xs text-gray-500">{t('planFree')}</span>;
  }

  function StatusBadge({
    suspendedAt,
    deletedAt,
  }: {
    suspendedAt: string | null;
    deletedAt: string | null;
  }) {
    if (deletedAt) {
      return (
        <span className="inline-flex rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
          {t('statusDeleted')}
        </span>
      );
    }
    if (suspendedAt) {
      return (
        <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          {t('statusSuspended')}
        </span>
      );
    }
    return (
      <span className="inline-flex rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        {t('statusActive')}
      </span>
    );
  }
}

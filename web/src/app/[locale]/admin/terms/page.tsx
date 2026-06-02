import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { AdminTermsListItem, MeDto } from '@/lib/types';

export default async function AdminTermsListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
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

  const items = (await serverGet<AdminTermsListItem[]>('/v1/admin/terms')) ?? [];
  const t = await getTranslations('Admin');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('termsTitle')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('termsSubtitle', { count: items.length })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/terms/new" className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            + {t('termsNewVersion')}
          </Link>
          <Link href="/admin" className="text-sm text-brand-700 hover:underline">
            ← {t('backToDashboard')}
          </Link>
        </div>
      </header>

      <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">{t('termsColLabel')}</th>
              <th className="px-4 py-2">{t('termsColStatus')}</th>
              <th className="px-4 py-2">{t('termsColLocales')}</th>
              <th className="px-4 py-2 text-right">{t('termsColAcceptances')}</th>
              <th className="px-4 py-2">{t('termsColCreated')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  {t('termsNoVersions')}
                </td>
              </tr>
            ) : (
              items.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    <Link href={`/admin/terms/${v.id}`} className="hover:underline">
                      {v.label}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {v.isActive ? (
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {t('termsStatusActive')}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{t('termsStatusInactive')}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-700">
                    {v.locales.length === 0 ? '—' : v.locales.join(' · ')}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {v.acceptanceCount}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {format.dateTime(new Date(v.createdAt), { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

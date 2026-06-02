import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { AdminTermsDetail, MeDto } from '@/lib/types';
import { LocaleEditor } from '../LocaleEditor';
import { TermsActions } from '../TermsActions';

export default async function AdminTermsDetailPage({
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

  const detail = await serverGet<AdminTermsDetail>(`/v1/admin/terms/${id}`);
  if (!detail) notFound();

  const t = await getTranslations('Admin');
  const format = await getFormatter();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <header>
        <Link href="/admin/terms" className="text-sm text-brand-700 hover:underline">
          {t('termsBackToList')}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{detail.label}</h1>
          {detail.isActive ? (
            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {t('termsStatusActive')}
            </span>
          ) : (
            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {t('termsStatusInactive')}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {format.dateTime(new Date(detail.createdAt), { dateStyle: 'medium' })}
          {' · '}
          {t('termsColAcceptances')}: {detail.acceptanceCount}
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <TermsActions
          versionId={detail.id}
          label={detail.label}
          isActive={detail.isActive}
          acceptanceCount={detail.acceptanceCount}
          existingLocales={detail.locales}
        />
      </section>

      {detail.bodies.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('termsNoLocalesYet')}
        </p>
      ) : (
        <div className="space-y-4">
          {detail.bodies.map((b) => (
            <LocaleEditor
              key={b.locale}
              versionId={detail.id}
              locale={b.locale}
              initialBody={b.body}
              canDelete={detail.bodies.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

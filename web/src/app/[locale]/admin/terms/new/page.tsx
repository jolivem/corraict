import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { MeDto } from '@/lib/types';
import { NewTermsForm } from './NewTermsForm';

export default async function AdminTermsNewPage({
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

  const t = await getTranslations('Admin');

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <header>
        <Link href="/admin/terms" className="text-sm text-brand-700 hover:underline">
          {t('termsBackToList')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{t('termsNewVersion')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('termsLocalePromptHint')}</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <NewTermsForm />
      </section>
    </div>
  );
}

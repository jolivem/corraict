import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { MeDto } from '@/lib/types';
import { DataSection } from '../DataSection';

export default async function AccountPage({
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

  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-bold text-ink">{t('accountPageTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('welcome', { email: me?.email ?? '' })}</p>
      </header>

      <DataSection />
    </div>
  );
}

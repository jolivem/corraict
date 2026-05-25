import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');
  const tCommon = await getTranslations('Common');

  const features = [
    { title: t('feature1Title'), body: t('feature1Body') },
    { title: t('feature2Title'), body: t('feature2Body') },
    { title: t('feature3Title'), body: t('feature3Body') },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <section className="text-center">
        <h1 className="whitespace-pre-line text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {t('heroTitle')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">{t('heroSubtitle')}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-md bg-brand-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-brand-700"
          >
            {tCommon('ctaTryFree')}
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">{f.title}</h2>
            <p className="mt-3 text-sm text-gray-600">{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

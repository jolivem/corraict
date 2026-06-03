import type { ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LocaleLinks } from '@/components/LocaleLinks';

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}

function IconDevice() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <line x1="10.5" y1="18.5" x2="13.5" y2="18.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Landing');
  const tCommon = await getTranslations('Common');

  const features: { title: string; body: string; icon: ReactNode }[] = [
    { title: t('feature1Title'), body: t('feature1Body'), icon: <IconCheck /> },
    { title: t('feature2Title'), body: t('feature2Body'), icon: <IconDevice /> },
    { title: t('feature3Title'), body: t('feature3Body'), icon: <IconShield /> },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <section className="text-center">
        <h1 className="whitespace-pre-line text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          {t('heroTitle')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">{t('heroSubtitle')}</p>
        <div className="mt-10 flex flex-col items-center gap-5">
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            {tCommon('ctaTryFree')}
          </Link>
          <LocaleLinks />
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-2xl border border-line bg-surface p-6 shadow-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-ink">
              {f.icon}
            </div>
            <h2 className="mt-4 text-lg font-semibold text-ink">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-body">{f.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

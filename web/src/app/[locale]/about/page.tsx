import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'About' });
  const base = siteUrl();
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}/${locale}/about`,
      languages: {
        fr: `${base}/fr/about`,
        en: `${base}/en/about`,
        'x-default': `${base}/fr/about`,
      },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('About');
  const tCommon = await getTranslations('Common');
  const base = siteUrl();

  const sections = ['s1', 's2', 's3', 's4'] as const;

  // schema.org AboutPage : décrit l'organisation et sa fondatrice pour que les
  // moteurs et les IA comprennent qui est derrière Plume et pourquoi.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    inLanguage: locale,
    mainEntity: {
      '@type': 'Organization',
      name: 'Plume',
      url: base,
      description: t('metaDescription'),
      founder: {
        '@type': 'Person',
        name: 'Eloïse',
        jobTitle: locale === 'fr' ? 'Fondatrice' : 'Founder',
      },
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Échappe "<" pour que le JSON sérialisé ne puisse jamais casser le script. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg text-muted">{t('subtitle')}</p>
      </header>

      <article className="mt-8">
        <p className="text-lg leading-relaxed text-body">{t('intro')}</p>
        {sections.map((key) => (
          <section key={key} className="mt-8">
            <h2 className="text-xl font-semibold text-ink">{t(`${key}Title`)}</h2>
            <p className="mt-3 leading-relaxed text-body">{t(`${key}Body`)}</p>
          </section>
        ))}
      </article>

      <section className="mt-14 rounded-2xl border border-line bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold text-ink">{t('ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-body">{t('ctaBody')}</p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          {tCommon('ctaTryFree')}
        </Link>
      </section>
    </div>
  );
}

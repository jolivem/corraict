import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, routing } from '@/i18n/routing';
import { flattenFaq, getFaq } from '@/lib/faq';
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
  const t = await getTranslations({ locale, namespace: 'FAQ' });
  const base = siteUrl();
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}/${locale}/faq`,
      languages: {
        fr: `${base}/fr/faq`,
        en: `${base}/en/faq`,
        'x-default': `${base}/fr/faq`,
      },
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('FAQ');
  const tCommon = await getTranslations('Common');

  const categories = getFaq(locale);

  // schema.org FAQPage — the machine-readable representation that search
  // engines and AI answer engines parse to surface our answers directly.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: flattenFaq(categories).map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a.join('\n\n'),
      },
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Escape "<" so the serialized JSON can never break out of the script. */}
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

      <div className="mt-10 space-y-12">
        {categories.map((category) => (
          <section key={category.id} aria-labelledby={`faq-${category.id}`}>
            <h2
              id={`faq-${category.id}`}
              className="text-xl font-semibold text-ink"
            >
              {category.title}
            </h2>
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface px-5">
              {category.items.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <h3 className="text-base font-medium text-ink">{item.q}</h3>
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-xl leading-none text-muted transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-body">
                    {item.a.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

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

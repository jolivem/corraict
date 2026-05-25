import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalSection } from '@/components/LegalSection';

// Update this when the policy is revised; surfaced in the page footer.
const LAST_UPDATED = '2026-05-25';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Privacy');
  const tCommon = await getTranslations('Common');
  const format = await getFormatter();

  const sections = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {tCommon('lastUpdated', {
          date: format.dateTime(new Date(LAST_UPDATED), { dateStyle: 'long' }),
        })}
      </p>
      <p className="mt-6 text-base text-gray-700">{t('intro')}</p>
      {sections.map((key) => (
        <LegalSection key={key} title={t(`${key}Title`)}>
          {t(`${key}Body`)}
        </LegalSection>
      ))}
    </article>
  );
}

import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalMarkdown } from '@/components/LegalMarkdown';
import { getPrivacy } from '@/content/legalContent';

// Date de mise à jour du texte. À ajuster lors d'une révision.
const LAST_UPDATED = '2026-06-04';

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

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {tCommon('lastUpdated', {
          date: format.dateTime(new Date(LAST_UPDATED), { dateStyle: 'long' }),
        })}
      </p>
      <LegalMarkdown>{getPrivacy(locale)}</LegalMarkdown>
    </article>
  );
}

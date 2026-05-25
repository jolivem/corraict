import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalSection } from '@/components/LegalSection';

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Imprint');

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <LegalSection title={t('publisherTitle')}>{t('publisherBody')}</LegalSection>
      <LegalSection title={t('hostingTitle')}>{t('hostingBody')}</LegalSection>
      <LegalSection title={t('ipTitle')}>{t('ipBody')}</LegalSection>
      <LegalSection title={t('contactTitle')}>{t('contactBody')}</LegalSection>
    </article>
  );
}

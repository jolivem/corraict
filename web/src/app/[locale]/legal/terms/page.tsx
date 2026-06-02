import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import { LegalSection } from '@/components/LegalSection';
import { serverGet } from '@/lib/api.server';
import type { ActiveTermsDto } from '@/lib/types';

const LAST_UPDATED_FALLBACK = '2026-05-25';

/**
 * Affiche les CGU :
 *   - Si une version active existe (gérée par l'admin), on rend son markdown
 *     dans la locale demandée (avec fallback côté backend).
 *   - Sinon, on retombe sur le contenu statique des fichiers i18n (rétrocompat
 *     avant le premier déploiement de la feature).
 */
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Terms');
  const tCommon = await getTranslations('Common');
  const format = await getFormatter();

  // serverGet utilise une session cookie si présente, mais l'endpoint /v1/terms/active
  // est public — il retournera bien le contenu même sans cookie.
  const active = await serverGet<ActiveTermsDto>(
    `/v1/terms/active?locale=${encodeURIComponent(locale)}`,
  );

  if (active) {
    return (
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {tCommon('lastUpdated', {
            date: format.dateTime(new Date(active.updatedAt), { dateStyle: 'long' }),
          })}
        </p>
        <div className="prose prose-sm mt-6 max-w-none">
          <ReactMarkdown>{active.body}</ReactMarkdown>
        </div>
      </article>
    );
  }

  // Fallback statique — copie de l'ancienne page basée sur i18n.
  const sections = ['s1', 's2', 's3', 's4', 's5', 's6'] as const;
  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {tCommon('lastUpdated', {
          date: format.dateTime(new Date(LAST_UPDATED_FALLBACK), { dateStyle: 'long' }),
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

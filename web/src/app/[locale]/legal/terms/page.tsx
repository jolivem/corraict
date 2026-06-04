import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalMarkdown } from '@/components/LegalMarkdown';
import { serverGet } from '@/lib/api.server';
import type { ActiveTermsDto } from '@/lib/types';
import { getTerms } from '@/content/legalContent';

// Date de mise à jour du texte statique (fallback). À ajuster lors d'une révision.
const LAST_UPDATED_FALLBACK = '2026-06-04';

/**
 * Affiche les CGU :
 *   - Si une version active existe (gérée par l'admin), on rend son markdown
 *     dans la locale demandée (avec fallback côté backend).
 *   - Sinon, on rend le texte de référence (CGU/CGV) en markdown.
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

  const updatedAt = active ? new Date(active.updatedAt) : new Date(LAST_UPDATED_FALLBACK);
  const body = active ? active.body : getTerms(locale);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-sm text-gray-500">
        {tCommon('lastUpdated', {
          date: format.dateTime(updatedAt, { dateStyle: 'long' }),
        })}
      </p>
      <LegalMarkdown>{body}</LegalMarkdown>
    </article>
  );
}

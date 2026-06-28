import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

/**
 * Page d'atterrissage après un paiement Stripe réussi (success_url). Volontairement
 * hors du groupe (app) — donc sans garde d'authentification — pour ne jamais
 * rediriger vers /login juste après le paiement. L'activation de l'abonnement est
 * confirmée de façon asynchrone par le webhook Stripe ; on affiche un message
 * rassurant et un lien vers le tableau de bord / l'abonnement.
 */
export default async function BillingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <path d="M4 12.5 9 17.5 20 6.5" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl font-bold text-ink">{t('billingSuccessTitle')}</h1>
      <p className="mt-3 text-body">{t('billingSuccessBody')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/subscription"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('billingSuccessCta')}
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-body hover:bg-surface-muted"
        >
          {t('billingBackToDashboard')}
        </Link>
      </div>
    </div>
  );
}

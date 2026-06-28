import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

/**
 * Page d'atterrissage après l'annulation d'un paiement Stripe (cancel_url).
 * Hors du groupe (app) pour la même raison que la page de succès : pas de garde
 * d'authentification au retour de Stripe.
 */
export default async function BillingCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-ink">{t('billingCancelTitle')}</h1>
      <p className="mt-3 text-body">{t('billingCancelBody')}</p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/subscription"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('billingCancelCta')}
        </Link>
      </div>
    </div>
  );
}

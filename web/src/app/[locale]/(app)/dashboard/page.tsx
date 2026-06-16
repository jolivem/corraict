import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link, redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { MeDto, SubscriptionPayload, UsageSummary } from '@/lib/types';
import { UsageCard } from '../_components/UsageCard';
import { SubscriptionCard } from '../_components/SubscriptionCard';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await serverGet<MeDto>('/v1/auth/me');
  if (!me) {
    redirect({ href: '/login', locale });
  }

  const [usage, subscription] = await Promise.all([
    serverGet<UsageSummary>('/v1/usage'),
    serverGet<SubscriptionPayload>('/v1/billing/subscription'),
  ]);

  // Il n'y a plus de palier gratuit : l'accès au correcteur nécessite un
  // abonnement. On n'affiche donc jamais de barre de quota — un utilisateur
  // sans abonnement voit l'invite « S'abonner » dans la carte Abonnement.
  // (La barre reste prête côté UsageCard pour un futur quota premium.)
  const hasActiveSub = (subscription?.subscription?.status ?? '') === 'active' ||
    (subscription?.subscription?.status ?? '') === 'trialing';
  const isAdmin = me?.role === 'ADMIN';
  const isComplimentaryPro = me?.plan === 'PRO' && !hasActiveSub;
  const quotaLimit: number | null = null;

  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('welcome', { email: me?.email ?? '' })}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              {t('adminLink')}
            </Link>
          </div>
        )}
      </header>

      <UsageCard usage={usage} quotaLimit={quotaLimit} />

      <SubscriptionCard subscription={subscription} isComplimentaryPro={isComplimentaryPro} />
    </div>
  );
}

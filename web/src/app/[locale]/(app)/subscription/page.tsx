import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type {
  ApiTokenDto,
  InvoiceDto,
  MeDto,
  SubscriptionPayload,
} from '@/lib/types';
import { SubscriptionCard } from '../_components/SubscriptionCard';
import { InvoicesCard } from '../_components/InvoicesCard';
import { TokensSection } from '../TokensSection';

export default async function SubscriptionPage({
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

  const [subscription, tokens, invoices] = await Promise.all([
    serverGet<SubscriptionPayload>('/v1/billing/subscription'),
    serverGet<ApiTokenDto[]>('/v1/auth/tokens'),
    serverGet<InvoiceDto[]>('/v1/billing/invoices'),
  ]);

  const hasActiveSub = (subscription?.subscription?.status ?? '') === 'active' ||
    (subscription?.subscription?.status ?? '') === 'trialing';
  const isComplimentaryPro = me?.plan === 'PRO' && !hasActiveSub;

  const t = await getTranslations('Dashboard');

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-bold text-ink">{t('subscriptionPageTitle')}</h1>
      </header>

      <SubscriptionCard
        subscription={subscription}
        isComplimentaryPro={isComplimentaryPro}
        title={t('subscriptionCurrentTitle')}
        showCancelLink
      />

      <TokensSection initialTokens={tokens ?? []} />

      <InvoicesCard invoices={invoices ?? []} />
    </div>
  );
}

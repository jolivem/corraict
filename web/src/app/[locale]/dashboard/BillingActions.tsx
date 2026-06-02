'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiUrl } from '@/lib/api';
import type { ActiveTermsDto, TermsStatusDto } from '@/lib/types';
import { TermsAcceptDialog } from '@/components/TermsAcceptDialog';

export function BillingActions({
  hasSubscription,
  unavailableLabel,
}: {
  hasSubscription: boolean;
  unavailableLabel: string;
}) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingTerms, setPendingTerms] = useState<ActiveTermsDto | null>(null);

  async function tryCheckout(action: 'checkout' | 'portal') {
    setError(null);
    try {
      // Préflight CGU pour le checkout uniquement — le portal Stripe (gestion de
      // l'abonnement existant) n'est pas gated, le user a déjà accepté à l'achat.
      if (action === 'checkout') {
        const statusRes = await fetch(`${apiUrl()}/v1/terms/status`, {
          credentials: 'include',
        });
        if (statusRes.ok) {
          const status = (await statusRes.json()) as TermsStatusDto;
          if (status.activeVersionId && !status.accepted) {
            const versionRes = await fetch(
              `${apiUrl()}/v1/terms/active?locale=${encodeURIComponent(locale)}`,
            );
            if (versionRes.ok) {
              const version = (await versionRes.json()) as ActiveTermsDto | null;
              if (version) {
                setPendingTerms(version);
                return;
              }
            }
          }
        }
      }

      const res = await fetch(`${apiUrl()}/v1/billing/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Backend renvoie 400 terms_not_accepted en garde-fou si on l'a manqué côté front
      if (res.status === 400) {
        try {
          const json = (await res.json()) as { code?: string };
          if (json.code === 'terms_not_accepted') {
            // Re-fetch et affiche le dialog
            const versionRes = await fetch(
              `${apiUrl()}/v1/terms/active?locale=${encodeURIComponent(locale)}`,
            );
            if (versionRes.ok) {
              const version = (await versionRes.json()) as ActiveTermsDto | null;
              if (version) {
                setPendingTerms(version);
                return;
              }
            }
          }
        } catch {
          /* fallthrough */
        }
      }
      if (res.status === 503) {
        setError(unavailableLabel);
        return;
      }
      if (!res.ok) {
        setError(unavailableLabel);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.assign(data.url);
    } catch {
      setError(unavailableLabel);
    }
  }

  function handleClick(action: 'checkout' | 'portal') {
    startTransition(() => {
      void tryCheckout(action);
    });
  }

  function onTermsAccepted() {
    setPendingTerms(null);
    // Une fois le user dans la DB comme ayant accepté, on relance le checkout.
    startTransition(() => {
      void tryCheckout('checkout');
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => handleClick(hasSubscription ? 'portal' : 'checkout')}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {hasSubscription ? t('subscriptionManage') : t('subscriptionSubscribe')}
      </button>
      {error && <p className="text-sm text-amber-700">{error}</p>}
      {pendingTerms && (
        <TermsAcceptDialog
          version={pendingTerms}
          onAccepted={onTermsAccepted}
          onClose={() => setPendingTerms(null)}
        />
      )}
    </div>
  );
}

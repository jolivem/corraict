'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { apiUrl } from '@/lib/api';

export function BillingActions({
  hasSubscription,
  unavailableLabel,
}: {
  hasSubscription: boolean;
  unavailableLabel: string;
}) {
  const t = useTranslations('Dashboard');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(action: 'checkout' | 'portal') {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(`${apiUrl()}/v1/billing/${action}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
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
    </div>
  );
}

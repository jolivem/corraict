'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

interface Props {
  userId: string;
  email: string;
  isSelf: boolean;
  suspendedAt: string | null;
  currentPlan: 'FREE' | 'PRO';
  currentQuotaOverride: number | null;
}

export function AdminActions({
  userId,
  email,
  isSelf,
  suspendedAt,
  currentPlan,
  currentQuotaOverride,
}: Props) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [quotaInput, setQuotaInput] = useState<string>(
    currentQuotaOverride === null ? '' : String(currentQuotaOverride),
  );

  function refresh() {
    router.refresh();
  }

  async function call(path: string, init: RequestInit = {}) {
    setError(null);
    const res = await fetch(`${apiUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      setError(`${res.status} ${res.statusText}`);
      throw new Error(`HTTP ${res.status}`);
    }
  }

  function suspend() {
    if (!confirm(t('confirmSuspend'))) return;
    startTransition(async () => {
      try {
        await call(`/v1/admin/users/${userId}/suspend`, { method: 'POST' });
        refresh();
      } catch {
        /* error already surfaced */
      }
    });
  }

  function reactivate() {
    startTransition(async () => {
      try {
        await call(`/v1/admin/users/${userId}/reactivate`, { method: 'POST' });
        refresh();
      } catch {
        /* error already surfaced */
      }
    });
  }

  function setPlan(plan: 'FREE' | 'PRO') {
    if (plan === currentPlan) return;
    if (!confirm(t('confirmPlanChange', { plan }))) return;
    startTransition(async () => {
      try {
        await call(`/v1/admin/users/${userId}/plan`, {
          method: 'PATCH',
          body: JSON.stringify({ plan }),
        });
        refresh();
      } catch {
        /* error already surfaced */
      }
    });
  }

  function hardDelete() {
    // Confirmation forte : l'admin doit retaper l'email exact du compte.
    const entered = prompt(t('confirmHardDelete', { email }));
    if (entered === null) return;
    if (entered.trim() !== email) {
      setError(t('hardDeleteMismatch'));
      return;
    }
    startTransition(async () => {
      try {
        await call(`/v1/admin/users/${userId}`, { method: 'DELETE' });
        // Le compte n'existe plus : on retourne à la liste.
        router.push('/admin');
      } catch {
        /* error already surfaced */
      }
    });
  }

  function applyQuota() {
    const trimmed = quotaInput.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      setError(t('quotaInvalid'));
      return;
    }
    startTransition(async () => {
      try {
        await call(`/v1/admin/users/${userId}/quota`, {
          method: 'PATCH',
          body: JSON.stringify({ monthlyRequestQuota: value }),
        });
        refresh();
      } catch {
        /* error already surfaced */
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {suspendedAt ? (
          <button
            type="button"
            onClick={reactivate}
            disabled={pending}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t('actionReactivate')}
          </button>
        ) : (
          <button
            type="button"
            onClick={suspend}
            disabled={pending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {t('actionSuspend')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPlan('PRO')}
          disabled={pending || currentPlan === 'PRO'}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('actionSetPlanPro')}
        </button>
        <button
          type="button"
          onClick={() => setPlan('FREE')}
          disabled={pending || currentPlan === 'FREE'}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('actionSetPlanFree')}
        </button>
      </div>

      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="block text-xs text-gray-500">{t('quotaLabel')}</span>
          <input
            type="number"
            min={0}
            value={quotaInput}
            onChange={(e) => setQuotaInput(e.target.value)}
            placeholder={t('quotaPlaceholder')}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={applyQuota}
          disabled={pending}
          className="rounded bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {t('quotaApply')}
        </button>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={hardDelete}
          disabled={pending || isSelf}
          title={isSelf ? t('hardDeleteSelfHint') : undefined}
          className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {t('actionHardDelete')}
        </button>
        <p className="mt-1 text-xs text-gray-500">
          {isSelf ? t('hardDeleteSelfHint') : t('hardDeleteHint')}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

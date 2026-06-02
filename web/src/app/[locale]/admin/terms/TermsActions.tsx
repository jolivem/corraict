'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

interface Props {
  versionId: string;
  label: string;
  isActive: boolean;
  acceptanceCount: number;
  existingLocales: string[];
}

export function TermsActions({
  versionId,
  label,
  isActive,
  acceptanceCount,
  existingLocales,
}: Props) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState(label);
  const [newLocale, setNewLocale] = useState('');

  async function call(path: string, init: RequestInit = {}): Promise<boolean> {
    setError(null);
    const res = await fetch(`${apiUrl()}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      setError(`${res.status} ${text.slice(0, 200)}`);
      return false;
    }
    return true;
  }

  function rename() {
    const trimmed = labelInput.trim();
    if (!trimmed || trimmed === label) return;
    startTransition(async () => {
      if (await call(`/v1/admin/terms/${versionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ label: trimmed }),
      })) {
        router.refresh();
      }
    });
  }

  function activate() {
    if (!confirm(t('termsConfirmActivate'))) return;
    startTransition(async () => {
      if (await call(`/v1/admin/terms/${versionId}/activate`, { method: 'POST' })) {
        router.refresh();
      }
    });
  }

  function remove() {
    if (acceptanceCount > 0) {
      setError(t('termsConfirmDelete'));
      return;
    }
    if (!confirm(t('termsConfirmDelete'))) return;
    startTransition(async () => {
      if (await call(`/v1/admin/terms/${versionId}`, { method: 'DELETE' })) {
        router.push('/admin/terms');
        router.refresh();
      }
    });
  }

  function addLocale() {
    const loc = newLocale.trim();
    if (!loc) return;
    // Vérif BCP 47 lite côté front pour UX immédiate
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(loc)) {
      setError(t('termsLocalePromptHint'));
      return;
    }
    if (existingLocales.includes(loc)) {
      setError(`${loc} déjà présent`);
      return;
    }
    startTransition(async () => {
      if (
        await call(`/v1/admin/terms/${versionId}/locales/${loc}`, {
          method: 'PUT',
          body: JSON.stringify({ body: '# ' + loc.toUpperCase() + '\n\n' }),
        })
      ) {
        setNewLocale('');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="block text-xs text-gray-500">{t('termsFieldLabel')}</span>
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            maxLength={50}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={rename}
          disabled={pending || labelInput.trim() === label}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('termsActionRename')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!isActive && (
          <button
            type="button"
            onClick={activate}
            disabled={pending || existingLocales.length === 0}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t('termsActionActivate')}
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending || acceptanceCount > 0}
          title={acceptanceCount > 0 ? `${acceptanceCount} acceptation(s)` : ''}
          className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {t('termsActionDelete')}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
        <label className="text-sm">
          <span className="block text-xs text-gray-500">{t('termsFieldLocale')}</span>
          <input
            type="text"
            value={newLocale}
            onChange={(e) => setNewLocale(e.target.value)}
            placeholder="fr, en, es, …"
            maxLength={8}
            className="mt-1 w-32 rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
          />
        </label>
        <button
          type="button"
          onClick={addLocale}
          disabled={pending || !newLocale.trim()}
          className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          + {t('termsActionAddLocale')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

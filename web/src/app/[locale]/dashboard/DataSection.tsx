'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

export function DataSection() {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirmPhrase = t('deleteConfirmPhrase');
  const canConfirm = confirmInput.trim() === confirmPhrase;

  async function downloadExport() {
    setError(null);
    try {
      const res = await fetch(`${apiUrl()}/v1/users/me/export`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aicorrect-export.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(tCommon('loading'));
    }
  }

  function deleteAccount() {
    if (!canConfirm) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`${apiUrl()}/v1/users/me`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.status === 204) {
        router.push('/');
        router.refresh();
      } else {
        setError(tCommon('loading'));
      }
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">{t('dataTitle')}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('dataSubtitle')}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{t('dataExportTitle')}</h3>
          <p className="mt-1 text-sm text-gray-600">{t('dataExportDesc')}</p>
          <button
            type="button"
            onClick={downloadExport}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('dataExportButton')}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-red-700">{t('dataDeleteTitle')}</h3>
          <p className="mt-1 text-sm text-gray-600">{t('dataDeleteDesc')}</p>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            {t('dataDeleteButton')}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-amber-700">{error}</p>}

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">{t('deleteConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-gray-700">
              {t('deleteConfirmBody', { phrase: confirmPhrase })}
            </p>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">
                {t('deleteConfirmInputLabel')}
              </span>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmPhrase}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmInput('');
                }}
                disabled={pending}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={pending || !canConfirm}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? tCommon('loading') : t('deleteConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

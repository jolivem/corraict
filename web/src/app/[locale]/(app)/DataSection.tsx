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
    <>
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('dataTitle')}</h2>
        <p className="mt-1 text-sm text-body">{t('dataSubtitle')}</p>
        <button
          type="button"
          onClick={downloadExport}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted sm:w-auto"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
          </svg>
          {t('dataExportButton')}
        </button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      <section className="rounded-2xl border border-danger-line bg-danger-bg p-6">
        <h3 className="flex items-center gap-2 text-base font-semibold text-danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
          </svg>
          {t('dataDeleteTitle')}
        </h3>
        <p className="mt-1 text-sm text-body">{t('dataDeleteDesc')}</p>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-danger-line px-4 py-2.5 text-sm font-medium text-danger hover:bg-white/50 sm:w-auto"
        >
          {t('dataDeleteButton')}
        </button>
      </section>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !pending && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-ink">{t('deleteConfirmTitle')}</h3>
            <p className="mt-2 text-sm text-body">
              {t('deleteConfirmBody', { phrase: confirmPhrase })}
            </p>
            <label className="mt-4 flex flex-col gap-1">
              <span className="text-sm font-medium text-body">
                {t('deleteConfirmInputLabel')}
              </span>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={confirmPhrase}
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-body focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger"
                autoFocus
              />
            </label>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmInput('');
                }}
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body hover:bg-surface-muted disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={pending || !canConfirm}
                className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? tCommon('loading') : t('deleteConfirmAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

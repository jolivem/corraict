'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { apiUrl } from '@/lib/api';
import type { ActiveTermsDto } from '@/lib/types';

interface Props {
  version: ActiveTermsDto;
  onAccepted: () => void;
  onClose: () => void;
}

/**
 * Modal d'acceptation des CGU. Affiche le markdown rendu, exige une checkbox,
 * appelle `/v1/terms/accept` à la validation puis remonte le callback pour que
 * l'appelant relance l'action gated (typiquement, Stripe Checkout).
 */
export function TermsAcceptDialog({ version, onAccepted, onClose }: Props) {
  const t = useTranslations('Terms');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`${apiUrl()}/v1/terms/accept`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ termsVersionId: version.id }),
        });
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        onAccepted();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <header className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{t('dialogTitle')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('dialogIntro')}</p>
          <p className="mt-1 text-xs text-gray-500">
            {version.label} · {t('lastUpdated', { date: formatDate(version.updatedAt) })}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-sm max-w-none">
          <ReactMarkdown>{version.body}</ReactMarkdown>
        </div>

        <footer className="border-t border-gray-200 px-6 py-4">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('acceptCheckbox')}</span>
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('cancelButton')}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!checked || pending}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {t('acceptButton')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';
import type { ApiTokenDto, NewTokenResponse } from '@/lib/types';
import { NewTokenDialog } from './NewTokenDialog';

export function TokensSection({ initialTokens }: { initialTokens: ApiTokenDto[] }) {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<NewTokenResponse | null>(null);

  function refresh() {
    router.refresh();
  }

  async function createToken(e: FormEvent) {
    e.preventDefault();
    const labelTrimmed = label.trim();
    if (!labelTrimmed) return;
    startTransition(async () => {
      const res = await fetch(`${apiUrl()}/v1/auth/tokens`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelTrimmed }),
      });
      if (res.ok) {
        const json = (await res.json()) as NewTokenResponse;
        setCreated(json);
        setLabel('');
        setShowForm(false);
        refresh();
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const res = await fetch(`${apiUrl()}/v1/auth/tokens/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('tokensTitle')}</h2>
          <p className="mt-1 text-sm text-gray-600">{t('tokensSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t('tokensNew')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createToken} className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">{t('tokenLabelPrompt')}</span>
            <input
              type="text"
              required
              maxLength={100}
              autoFocus
              value={label}
              placeholder={t('tokenLabelPlaceholder')}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('tokenLabelCreate')}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setLabel('');
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {tCommon('cancel')}
          </button>
        </form>
      )}

      <ul className="mt-4 divide-y divide-gray-100">
        {initialTokens.length === 0 ? (
          <li className="py-4 text-sm text-gray-500">{t('tokensEmpty')}</li>
        ) : (
          initialTokens.map((token) => (
            <li key={token.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="font-medium text-gray-900">{token.label}</p>
                <p className="text-xs text-gray-500">
                  {t('tokensCreatedAt', {
                    date: format.dateTime(new Date(token.createdAt), { dateStyle: 'medium' }),
                  })}
                  {' · '}
                  {token.lastUsedAt
                    ? t('tokensLastUsed', {
                        date: format.dateTime(new Date(token.lastUsedAt), {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
                      })
                    : t('tokensNeverUsed')}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => revoke(token.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {t('tokensRevoke')}
              </button>
            </li>
          ))
        )}
      </ul>

      {created && <NewTokenDialog token={created} onClose={() => setCreated(null)} />}
    </section>
  );
}

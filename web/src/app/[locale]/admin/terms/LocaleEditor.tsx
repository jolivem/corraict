'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

interface Props {
  versionId: string;
  locale: string;
  initialBody: string;
  canDelete: boolean; // false si c'est la seule locale restante
}

export function LocaleEditor({ versionId, locale, initialBody, canDelete }: Props) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `${apiUrl()}/v1/admin/terms/${versionId}/locales/${locale}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!canDelete) return;
    if (!confirm(t('termsConfirmDeleteLocale', { locale }))) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `${apiUrl()}/v1/admin/terms/${versionId}/locales/${locale}`,
        { method: 'DELETE', credentials: 'include' },
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
          {locale}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t('termsActionSave')}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending || !canDelete}
            title={canDelete ? '' : t('termsNoLocalesYet')}
            className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {t('termsActionDeleteLocale')}
          </button>
        </div>
      </header>
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-r border-gray-100 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('termsFieldBody')}
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={18}
            className="block w-full resize-y rounded border border-gray-300 p-2 font-mono text-xs"
            placeholder={t('termsEditorHint')}
          />
          <p className="mt-1 text-xs text-gray-500">{t('termsEditorHint')}</p>
        </div>
        <div className="p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('termsPreview')}
          </p>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        </div>
      </div>
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import type { NewTokenResponse } from '@/lib/types';

export function NewTokenDialog({
  token,
  onClose,
}: {
  token: NewTokenResponse;
  onClose: () => void;
}) {
  const t = useTranslations('Dashboard');
  const tCommon = useTranslations('Common');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(token.token, { width: 240, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [token.token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. http without secure context) — fail silently.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900">{t('tokenCreatedTitle')}</h2>
        <p className="mt-2 text-sm font-medium text-amber-700">{t('tokenCreatedWarning')}</p>

        <div className="mt-4 flex flex-col items-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={t('tokenScanInstruction')}
              className="rounded border border-gray-200"
              width={240}
              height={240}
            />
          ) : (
            <div className="h-[240px] w-[240px] animate-pulse rounded bg-gray-100" />
          )}
          <p className="mt-2 text-xs text-gray-500">{t('tokenScanInstruction')}</p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs">
          <code className="flex-1 truncate">{token.token}</code>
          <button
            type="button"
            onClick={copy}
            className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-100"
          >
            {copied ? tCommon('copied') : tCommon('copy')}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

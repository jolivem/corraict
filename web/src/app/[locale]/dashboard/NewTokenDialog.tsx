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
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">{t('tokenCreatedTitle')}</h2>
        <p className="mt-2 text-sm font-medium text-danger">{t('tokenCreatedWarning')}</p>

        <div className="mt-4 flex flex-col items-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={t('tokenScanInstruction')}
              className="rounded-lg border border-line"
              width={240}
              height={240}
            />
          ) : (
            <div className="h-[240px] w-[240px] animate-pulse rounded-lg bg-surface-muted" />
          )}
          <p className="mt-2 text-xs text-muted">{t('tokenScanInstruction')}</p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-surface-muted p-2 font-mono text-xs text-body">
          <code className="flex-1 truncate">{token.token}</code>
          <button
            type="button"
            onClick={copy}
            className="rounded bg-surface px-2 py-1 text-xs font-medium text-body ring-1 ring-line hover:bg-cream"
          >
            {copied ? tCommon('copied') : tCommon('copy')}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {tCommon('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

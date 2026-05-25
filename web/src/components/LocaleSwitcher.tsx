'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';

const LOCALES: AppLocale[] = ['fr', 'en'];

export function LocaleSwitcher() {
  const t = useTranslations('Locale');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="sr-only">{t('switch')}</span>
      <select
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        value={locale}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as AppLocale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {t(loc)}
          </option>
        ))}
      </select>
    </label>
  );
}

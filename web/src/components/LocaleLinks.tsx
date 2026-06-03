'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import type { AppLocale } from '@/i18n/routing';

const LOCALES: AppLocale[] = ['fr', 'en'];

/** Ligne « Français · English » : bascule de langue en texte (style maquette). */
export function LocaleLinks() {
  const t = useTranslations('Locale');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted">
      {LOCALES.map((loc, i) => (
        <Fragment key={loc}>
          {i > 0 && <span aria-hidden>·</span>}
          <button
            type="button"
            disabled={isPending || loc === locale}
            onClick={() =>
              startTransition(() => {
                router.replace(pathname, { locale: loc });
              })
            }
            className={
              loc === locale
                ? 'font-medium text-ink'
                : 'hover:text-ink disabled:opacity-50'
            }
          >
            {t(loc)}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

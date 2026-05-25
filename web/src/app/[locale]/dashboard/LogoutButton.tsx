'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

export function LogoutButton() {
  const t = useTranslations('Common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch(`${apiUrl()}/v1/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
          router.push('/');
          router.refresh();
        });
      }}
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      {pending ? t('loading') : t('logout')}
    </button>
  );
}

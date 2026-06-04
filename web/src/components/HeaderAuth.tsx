'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

/**
 * Îlot client affiché dans le header : montre « Se déconnecter » uniquement
 * quand une session est active, et rien sinon. Étant un composant client, il
 * n'empêche pas la génération statique des pages (le layout reste statique ;
 * la vérification de session se fait côté navigateur après hydratation).
 */
export function HeaderAuth() {
  const t = useTranslations('Common');
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl()}/v1/auth/me`, { credentials: 'include' })
      .then((res) => {
        if (active) setAuthed(res.ok);
      })
      .catch(() => {
        if (active) setAuthed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!authed) return null;

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
          setAuthed(false);
          router.push('/');
          router.refresh();
        });
      }}
      className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body hover:bg-surface-muted disabled:opacity-50"
    >
      {pending ? t('loading') : t('logout')}
    </button>
  );
}

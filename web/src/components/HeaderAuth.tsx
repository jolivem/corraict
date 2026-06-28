'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

/**
 * Îlot client du header. Selon l'état de session (vérifié côté navigateur) :
 *  - déconnecté → lien « Se connecter » (visible sur toutes les tailles : un
 *    visiteur déconnecté n'a pas de menu hamburger) ;
 *  - connecté → bouton « Se déconnecter », masqué sur mobile car déjà présent
 *    dans le menu hamburger (HeaderNav), visible sur desktop.
 * Étant un composant client, il n'empêche pas la génération statique du layout.
 */
export function HeaderAuth() {
  const t = useTranslations('Common');
  const router = useRouter();
  // null = session encore inconnue (évite un flash « Se connecter » / « Se déconnecter »).
  const [authed, setAuthed] = useState<boolean | null>(null);
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

  if (authed === null) return null;

  if (!authed) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body hover:bg-surface-muted"
      >
        {t('ctaLogin')}
      </Link>
    );
  }

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
      className="hidden rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-body hover:bg-surface-muted disabled:opacity-50 sm:block"
    >
      {pending ? t('loading') : t('logout')}
    </button>
  );
}

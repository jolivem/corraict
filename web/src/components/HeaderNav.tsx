'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { apiUrl } from '@/lib/api';

/**
 * Menu de navigation des pages connectées (Dashboard / Abonnement / Mon compte).
 * Comme HeaderAuth, c'est un îlot client : il vérifie la session côté navigateur
 * et ne rend rien tant que l'utilisateur n'est pas connecté, ce qui préserve la
 * génération statique du layout partagé avec les pages publiques.
 * Onglets inline sur desktop, menu hamburger déroulant sur mobile.
 */
const NAV_ITEMS = [
  { href: '/dashboard', key: 'navDashboard' },
  { href: '/subscription', key: 'navSubscription' },
  { href: '/account', key: 'navAccount' },
] as const;

export function HeaderNav() {
  const t = useTranslations('Common');
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);

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

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="relative">
      <ul className="hidden items-center gap-1 sm:flex">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive(item.href) ? 'bg-surface-muted text-ink' : 'text-body hover:bg-surface-muted'
              }`}
            >
              {t(item.key)}
            </Link>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-label={t('navMenu')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-lg border border-line px-2 py-1.5 text-body hover:bg-surface-muted sm:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" className="h-5 w-5">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border border-line bg-surface p-1 shadow-lg sm:hidden">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(item.href) ? 'bg-surface-muted text-ink' : 'text-body hover:bg-surface-muted'
                }`}
              >
                {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

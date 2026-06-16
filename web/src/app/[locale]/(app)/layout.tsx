import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { MeDto } from '@/lib/types';

/**
 * Garde d'authentification partagée par les pages connectées (dashboard,
 * subscription, account). Une seule vérification de session ici évite de la
 * répéter dans chaque page ; les pages refont un fetch léger de `me` quand
 * elles ont besoin de l'email ou du plan.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await serverGet<MeDto>('/v1/auth/me');
  if (!me) {
    redirect({ href: '/login', locale });
  }

  return <>{children}</>;
}

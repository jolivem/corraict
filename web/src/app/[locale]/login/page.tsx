import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/i18n/routing';
import { serverGet } from '@/lib/api.server';
import type { MeDto } from '@/lib/types';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Déjà connecté (cookie de session valide) → on évite de redemander le code.
  const me = await serverGet<MeDto>('/v1/auth/me');
  if (me) {
    redirect({ href: '/dashboard', locale });
  }

  return <LoginForm />;
}

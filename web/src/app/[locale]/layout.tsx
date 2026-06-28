import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Link, routing } from '@/i18n/routing';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { HeaderAuth } from '@/components/HeaderAuth';
import { HeaderNav } from '@/components/HeaderNav';
import { SiteFooter } from '@/components/SiteFooter';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Common' });
  return {
    title: t('appName'),
    description: t('tagline'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations('Common');
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <header className="border-b border-line bg-cream">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={t('appName')}
              className="shrink-0 text-base font-semibold leading-tight hover:opacity-80 sm:text-lg"
            >
              {/* « AiCorrect » dans le bleu des lettres « abc » du logo Android (#8FB8E0). */}
              <span className="block text-ink">Plume</span>
              <span className="block text-[#8FB8E0]">AiCorrect</span>
            </Link>
            <HeaderNav />
          </div>
          <div className="flex items-center gap-3">
            {/* Sur mobile, « Se déconnecter » est dans le menu hamburger (HeaderNav). */}
            <div className="hidden sm:block">
              <HeaderAuth />
            </div>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter appName={t('appName')} />
    </NextIntlClientProvider>
  );
}

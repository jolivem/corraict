import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function SiteFooter({ appName }: { appName: string }) {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line py-8">
      <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted">
        <nav className="flex flex-wrap justify-center gap-4">
          <Link href="/about" className="hover:text-ink">
            {t('about')}
          </Link>
          <Link href="/faq" className="hover:text-ink">
            {t('faq')}
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink">
            {t('privacy')}
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            {t('terms')}
          </Link>
          <Link href="/legal/imprint" className="hover:text-ink">
            {t('legal')}
          </Link>
        </nav>
        <p className="mt-3">
          © {year} {appName}. {t('rights')}
        </p>
      </div>
    </footer>
  );
}

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function SiteFooter({ appName }: { appName: string }) {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-gray-500">
        <p>
          © {year} {appName}. {t('rights')}
        </p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/legal/privacy" className="hover:text-gray-900">
            {t('privacy')}
          </Link>
          <Link href="/legal/terms" className="hover:text-gray-900">
            {t('terms')}
          </Link>
          <Link href="/legal/imprint" className="hover:text-gray-900">
            {t('legal')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}

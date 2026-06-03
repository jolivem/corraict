import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/site';

// Public, indexable routes (without locale prefix). The locale is prepended per
// entry, and every entry advertises its hreflang alternates.
const ROUTES: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/faq', priority: 0.8 },
  { path: '/about', priority: 0.7 },
  { path: '/legal/privacy', priority: 0.3 },
  { path: '/legal/terms', priority: 0.3 },
  { path: '/legal/imprint', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ROUTES.flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      changeFrequency: 'monthly' as const,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${base}/${l}${path}`]),
        ),
      },
    })),
  );
}

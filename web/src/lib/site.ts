/**
 * Canonical, absolute base URL of the public site (no trailing slash).
 * Used for canonical tags, hreflang alternates, sitemap.xml, robots.txt and
 * JSON-LD. Override per environment via NEXT_PUBLIC_SITE_URL.
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aicorrect.app';
  return raw.replace(/\/+$/, '');
}

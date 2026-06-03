import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

// Private, auth-gated areas we don't want in any index (locale-prefixed routes).
const PRIVATE_PATHS = [
  '/*/dashboard',
  '/*/admin',
  '/*/login',
  '/fr/dashboard',
  '/en/dashboard',
  '/fr/admin',
  '/en/admin',
  '/fr/login',
  '/en/login',
];

// AI / answer-engine crawlers we explicitly welcome so they can read the FAQ.
const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_BOTS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

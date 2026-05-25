import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle in .next/standalone so the Docker
  // runtime image only needs Node + the trace output (no full node_modules).
  output: 'standalone',
  // Pin the trace root to this directory so Next.js stops picking the repo
  // root (which has its own empty package-lock.json) as the workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

export default withNextIntl(nextConfig);

import './globals.css';

import type { ReactNode } from 'react';

// We can't read params here (root layouts run outside the locale segment),
// so lang is set to the default and remains static. Per-route content is
// fully localized via NextIntlClientProvider in [locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}

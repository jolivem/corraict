import type { ReactNode } from 'react';

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  );
}

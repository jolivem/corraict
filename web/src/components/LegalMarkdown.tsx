import ReactMarkdown, { type Components } from 'react-markdown';

/**
 * Rend du markdown légal avec un style cohérent, sans dépendre du plugin
 * `@tailwindcss/typography` (non installé). Chaque élément reçoit ses classes.
 */
const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 text-lg font-semibold text-gray-900">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-gray-900">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-3 text-sm leading-relaxed text-gray-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  a: ({ href, children }) => {
    const external = href?.startsWith('http');
    return (
      <a
        href={href}
        className="text-brand-700 underline"
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-8 border-line" />,
};

export function LegalMarkdown({ children }: { children: string }) {
  return (
    <div className="mt-6">
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
    </div>
  );
}

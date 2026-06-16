import { getFormatter, getTranslations } from 'next-intl/server';
import type { InvoiceDto } from '@/lib/types';

export async function InvoicesCard({ invoices }: { invoices: InvoiceDto[] }) {
  const t = await getTranslations('Dashboard');
  const format = await getFormatter();

  const statusLabel = (status: string): string => {
    const key = `invoiceStatus_${status}` as const;
    // Translation keys are pre-declared; fall back to raw status if missing.
    try {
      return t(key);
    } catch {
      return status;
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{t('invoicesTitle')}</h2>
      {invoices.length === 0 ? (
        <div className="mt-4 rounded-lg bg-surface-muted px-4 py-3 text-sm text-muted">
          {t('invoicesEmpty')}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="text-sm">
                <p className="font-medium text-ink">
                  {format.number(inv.amountCents / 100, {
                    style: 'currency',
                    currency: inv.currency.toUpperCase(),
                  })}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {statusLabel(inv.status)}
                  </span>
                </p>
                <p className="text-xs text-muted">
                  {format.dateTime(new Date(inv.periodStart), { dateStyle: 'medium' })}
                  {' → '}
                  {format.dateTime(new Date(inv.periodEnd), { dateStyle: 'medium' })}
                </p>
              </div>
              {(inv.pdfUrl ?? inv.hostedUrl) && (
                <a
                  href={inv.pdfUrl ?? inv.hostedUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  {t('invoicesDownload')}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import type { AppLocale } from '@/i18n/routing';
import { FAQ_FR } from './faq.fr';
import { FAQ_EN } from './faq.en';

/** One question and its answer (split into paragraphs for clean rendering). */
export type FaqItem = { q: string; a: string[] };

/** A thematic group of questions, rendered under its own heading. */
export type FaqCategory = { id: string; title: string; items: FaqItem[] };

const BY_LOCALE: Record<AppLocale, FaqCategory[]> = {
  fr: FAQ_FR,
  en: FAQ_EN,
};

/** Localized FAQ content; falls back to French for unknown locales. */
export function getFaq(locale: string): FaqCategory[] {
  return BY_LOCALE[locale as AppLocale] ?? FAQ_FR;
}

/** Flatten every question across categories — used to build the JSON-LD FAQPage. */
export function flattenFaq(categories: FaqCategory[]): FaqItem[] {
  return categories.flatMap((c) => c.items);
}

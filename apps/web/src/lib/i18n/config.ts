/**
 * i18n config — the single source of truth for supported locales.
 *
 * This site uses CLIENT-SIDE localization (a React context that swaps the active
 * dictionary in place), not Next's route-based `[lang]` i18n: the page is a
 * single heavily-animated portfolio with a full-screen intro that would replay
 * on every navigation, and the language switch lives in the footer as an
 * in-place toggle. Trade-off: only the default (English) content is
 * server-rendered for crawlers; the Vietnamese copy is a client swap.
 */

export const LOCALES = ["en", "vi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Persisted preference key (localStorage + cookie mirror for the lang script). */
export const LOCALE_STORAGE_KEY = "evan-locale";

/** Human labels for the switcher, in each language's own name (autonyms). */
export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  en: { short: "EN", name: "English" },
  vi: { short: "VI", name: "Tiếng Việt" },
};

/** Narrow an arbitrary string to a supported Locale (falls back to default). */
export function normalizeLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

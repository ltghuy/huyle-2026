"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type Locale,
} from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** Active-locale UI/prose dictionary. */
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// localStorage is the source of truth; a custom event (plus the native `storage`
// event for other tabs) drives re-renders. Read via useSyncExternalStore so the
// server snapshot is the default locale (hydration-safe) and the stored choice is
// picked up on the client without a setState-in-effect.
const LOCALE_EVENT = "locale:change";

function subscribe(callback: () => void) {
  window.addEventListener(LOCALE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(LOCALE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Locale {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

/**
 * Client-side locale state, persisted to localStorage and reflected on
 * `<html lang>`. SSR and the first client render use DEFAULT_LOCALE (server
 * snapshot) so hydration matches; a stored non-default preference is applied
 * right after — a one-frame text swap for returning Vietnamese visitors, which
 * is inherent to client-side i18n on a static page. The inline script in
 * layout.tsx sets `<html lang>` before paint so the document language is already
 * correct before hydration.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* localStorage blocked (private mode, etc.) — the switch won't persist. */
    }
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  // Keep the document language attribute in sync (a11y / SEO / hyphenation).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider
      value={{ locale, setLocale, t: dictionaries[locale] }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

/** Current locale + setter + active dictionary. Throws if used outside the provider. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

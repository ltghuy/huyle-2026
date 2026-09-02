"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider.client";

/**
 * Skip-to-content link (WCAG 2.4.1 "Bypass Blocks"). Visually hidden until it
 * receives keyboard focus — then it pins to the top-left so a keyboard or
 * screen-reader user can jump straight past the fixed nav to <main id="main">.
 * It is the first focusable element in the body (rendered first in <body>).
 */
export function SkipLink() {
  const { t } = useLocale();
  return (
    <a
      href="#main"
      className="sr-only rounded-lg font-semibold focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-200 focus-visible:bg-accent focus-visible:px-4 focus-visible:py-2 focus-visible:text-(--color-base)"
    >
      {t.skip.toContent}
    </a>
  );
}

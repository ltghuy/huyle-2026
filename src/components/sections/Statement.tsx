"use client";

import { ScrollHighlightText } from "@/components/motion/ScrollHighlightText";
import { useLocale } from "@/lib/i18n/LocaleProvider.client";

/**
 * A single quiet, centered "breath" beat between the hero and the capabilities
 * (feature 002 — editorial re-style). One line about what Huy does, surrounded
 * by generous negative space, mirroring the reference's mission-statement moment.
 *
 * The line uses a scroll-driven highlight (à la the GSAP Vault "scroll text
 * highlight"): a reading front sweeps word-by-word as the block scrolls through,
 * settling the key phrase to accent and the rest to `fg`.
 */
export function Statement() {
  const { t, locale } = useLocale();
  return (
    <section
      id="statement"
      className="relative px-6 py-32 sm:px-12 sm:py-40 lg:px-20"
    >
      {/* Remount on locale change: ScrollHighlightText splits the text into word
          spans on mount and won't re-split from a prop change alone. */}
      <ScrollHighlightText
        key={locale}
        className="mx-auto max-w-5xl text-center display text-3xl leading-tight text-fg sm:text-5xl"
        text={t.statement.text}
        accentPhrase={t.statement.accentPhrase}
      />
    </section>
  );
}

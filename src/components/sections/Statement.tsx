import { ScrollHighlightText } from "@/components/motion/ScrollHighlightText";

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
  return (
    <section
      id="statement"
      className="relative px-6 py-32 sm:px-12 sm:py-40 lg:px-20"
    >
      <ScrollHighlightText
        className="mx-auto max-w-5xl text-center display text-3xl leading-tight text-fg sm:text-5xl"
        text="“ I build production web platforms that stay fast, accessible, and considered — from product spec to production observability, with AI woven in where it earns its place. ”"
        accentPhrase="fast, accessible, and considered"
      />
    </section>
  );
}

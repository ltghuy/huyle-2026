"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

interface ScrollHighlightTextProps {
  /** The full line of copy. Split into per-word spans for the scroll highlight. */
  text: string;
  /** A contiguous phrase within `text` that settles to the accent colour (the
   *  rest settle to `fg`). Matched word-for-word; omit for an all-`fg` settle. */
  accentPhrase?: string;
  className?: string;
}

/**
 * Scroll Text Highlight (à la https://gsapvault.com/effects/scroll-text-highlight).
 *
 * The copy starts ghosted (muted + dim). As the block scrolls through the
 * viewport, a scrubbed "reading front" sweeps word-by-word: each word lifts and
 * its colour flashes `fg-subtle → accent-bright → accent`, then settles — to the
 * accent for the emphasised `accentPhrase`, or to `fg` for everything else.
 *
 * Progressive enhancement: the words render fully visible (accent phrase in
 * accent) with no JS, and stay that way under reduced motion. The ghosting and
 * sweep are applied only once motion is allowed.
 */
export function ScrollHighlightText({
  text,
  accentPhrase,
  className,
}: ScrollHighlightTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = usePrefersReducedMotion();

  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);
  const accentSet = useMemo(
    () => accentWordIndices(words, accentPhrase),
    [words, accentPhrase],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const wordEls = gsap.utils.toArray<HTMLElement>(el.querySelectorAll(".sh-word"));
    if (!wordEls.length) return;

    // Resolve the palette to concrete values — gsap's colour tween can't read
    // through `var(--…)`, so pull the computed hexes off the document root.
    const cs = getComputedStyle(document.documentElement);
    const token = (name: string) => cs.getPropertyValue(name).trim();
    const ghost = token("--color-fg-subtle");
    const edge = token("--color-accent-bright");
    const flash = token("--color-accent");
    const fg = token("--color-fg");

    const DIM = 0.42; // starting opacity of unread copy
    const LIFT = 10; // px the active word rises at the crest of the sweep
    const STEP = 1; // timeline spacing between consecutive words

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.set(wordEls, { opacity: DIM, color: ghost, y: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          end: "bottom 60%",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });

      wordEls.forEach((word, i) => {
        const t = i * STEP;
        const settle = accentSet.has(i) ? flash : fg;
        tl.to(word, { opacity: 1, color: edge, y: -LIFT * 0.45, duration: 0.16 }, t)
          .to(word, { color: flash, y: -LIFT, duration: 0.28 }, t + 0.16)
          .to(word, { color: settle, y: 0, duration: 0.72 }, t + 0.44);
      });
    }, el);

    return () => ctx.revert();
  }, [reduced, accentSet]);

  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span
            className={`sh-word inline-block${accentSet.has(i) ? " text-accent" : ""}`}
            style={{ willChange: "opacity, color, transform" }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </p>
  );
}

/** Indices of the words in `words` that make up the contiguous `phrase`. */
function accentWordIndices(words: string[], phrase?: string): Set<number> {
  const set = new Set<number>();
  if (!phrase) return set;
  const target = phrase.split(/\s+/).filter(Boolean);
  if (!target.length) return set;

  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, j) => words[i + j] === w)) {
      for (let j = 0; j < target.length; j++) set.add(i + j);
      break;
    }
  }
  return set;
}

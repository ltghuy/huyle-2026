"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

interface SpringInTextProps {
  text: string;
  className?: string;
  /** ms before the first letter springs in */
  delay?: number;
  /** seconds between consecutive letters landing */
  stagger?: number;
  /** hold off until the first-load intro has revealed the site */
  waitForIntro?: boolean;
}

/**
 * Per-letter "spring-in" headline (à la the NODECK wordmark on nodeck.online):
 * each glyph tumbles in from the right — small and over-rotated — then springs
 * into place with an elastic overshoot, staggered one letter after another. The
 * letters settle at a small, deterministic per-letter tilt so the finished word
 * reads hand-placed rather than mechanically aligned.
 *
 * The final text is the initial DOM (SEO + no-JS + reduced-motion friendly);
 * motion only runs on the client when allowed. Purely visual, so callers keep it
 * `aria-hidden` and expose the real text elsewhere (the hero's sr-only h1).
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Small resting tilts (deg), cycled per letter — the "hand-placed" look. */
const REST_ROT = [-6, 4, -3, 7, -5, 2, -7, 5, -2, 6, -4, 3];

export function SpringInText({
  text,
  className,
  delay = 0,
  stagger = 0.07,
  waitForIntro = false,
}: SpringInTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  const letters = () =>
    ref.current
      ? gsap.utils.toArray<HTMLElement>(
          ref.current.querySelectorAll("[data-letter]"),
        )
      : [];

  // Hide the glyphs synchronously (before paint) so nothing flashes in place
  // before it springs in. Skipped under reduced motion → letters stay visible.
  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    gsap.set(letters(), { autoAlpha: 0 });
  }, [reduced]);

  useEffect(() => {
    if (reduced) return;
    if (waitForIntro && !introDone) return;
    const els = letters();
    if (!els.length) return;

    const tl = gsap.timeline({ delay: delay / 1000 });
    els.forEach((el, i) => {
      const rest = REST_ROT[i % REST_ROT.length];
      tl.fromTo(
        el,
        {
          autoAlpha: 0,
          xPercent: 130,
          yPercent: 28,
          rotation: rest + 68,
          scale: 0.25,
          transformOrigin: "50% 60%",
        },
        {
          autoAlpha: 1,
          xPercent: 0,
          yPercent: 0,
          rotation: rest,
          scale: 1,
          duration: 1.05,
          ease: "elastic.out(1, 0.6)",
        },
        i * stagger,
      );
    });

    return () => {
      tl.kill();
      gsap.set(els, { clearProps: "all" });
    };
  }, [reduced, waitForIntro, introDone, delay, stagger, text]);

  return (
    // `whitespace-nowrap` keeps the per-letter inline-block spans on one line —
    // without it the large glyph boxes wrap and stack (a diagonal column).
    <span ref={ref} className={`${className ?? ""} whitespace-nowrap`.trim()}>
      {[...text].map((ch, i) =>
        ch === " " ? (
          <span key={i}> </span>
        ) : (
          <span
            key={i}
            data-letter
            className="inline-block will-change-transform"
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

interface LineRevealProps {
  children: ReactNode;
  className?: string;
  /** element to render (defaults to a paragraph) */
  as?: "p" | "h2" | "h3";
  /** seconds between successive lines */
  stagger?: number;
  /** seconds each line takes to rise */
  duration?: number;
  /** seconds to wait before the first line rises */
  delay?: number;
}

/**
 * Line-mask reveal (after webfactorypro.fr): the text is split into lines, each
 * line sits inside an `overflow: clip` mask, and its inner text slides up from
 * below the mask (translateY 100% → 0) with a per-line stagger the first time the
 * element scrolls into view. No fade — it's a pure mask reveal.
 *
 * The final text is the server-rendered / initial DOM (SEO + no-JS + reduced-
 * motion friendly); SplitText only restructures it on the client when motion is
 * allowed. `autoSplit` re-splits and replays on resize / after fonts load so the
 * line breaks stay correct.
 */
export function LineReveal({
  children,
  className,
  as: Tag = "p",
  stagger = 0.12,
  duration = 0.9,
  delay = 0,
}: LineRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    let split: SplitText | undefined;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "lines",
        // wraps each line in an overflow-clip mask so the rise is revealed
        mask: "lines",
        // Don't let SplitText stamp an `aria-label` on the element: on a <p>
        // (paragraph role) authored names are prohibited (axe/Lighthouse flag
        // it). We split by *lines* — the real words stay in DOM order — so the
        // native text remains fully readable to assistive tech without it.
        aria: "none",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 100,
            duration,
            ease: "power4.out",
            stagger,
            delay,
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }),
      });
    }, el);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [reduced, stagger, duration, delay]);

  if (Tag === "h2") {
    return (
      <h2 ref={setRef} className={className}>
        {children}
      </h2>
    );
  }
  if (Tag === "h3") {
    return (
      <h3 ref={setRef} className={className}>
        {children}
      </h3>
    );
  }
  return (
    <p ref={setRef} className={className}>
      {children}
    </p>
  );
}

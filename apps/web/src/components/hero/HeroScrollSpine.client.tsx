"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

/**
 * Motion layer for the type-as-spine hero (feature 002).
 *
 * As the hero scrolls away it drifts its layers at different rates — the
 * oversized name (`.hero-drift-slow`) lags, the runner labels / ambient glow
 * (`.hero-drift-fast`) lead — for a subtle editorial parallax. Deliberately
 * NOT a ScrollTrigger *pin*: pinning the hero would shift every downstream
 * scroll position and fight the rest of the page. A plain scrub is additive
 * and safe.
 *
 * Gated on `prefers-reduced-motion` (off entirely) and `intro-complete` (so it
 * doesn't run unseen behind the intro overlay). Selectors are scoped to the
 * container via `gsap.context`, so the server-rendered children need no refs.
 */
export function HeroScrollSpine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !introDone) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const scrub = { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 } as const;
      gsap.to(".hero-drift-slow", { yPercent: -6, ease: "none", scrollTrigger: scrub });
      gsap.to(".hero-drift-fast", { yPercent: -16, ease: "none", scrollTrigger: scrub });
    }, el);

    // Pinning-free, but layout still settles late (fonts/scene): recompute
    // trigger positions once fonts are ready so the drift stays aligned.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, [reduced, introDone]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

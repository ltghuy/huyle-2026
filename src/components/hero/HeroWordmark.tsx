"use client";

import { useLayoutEffect, useEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";
import { EVAN_MARK } from "@/lib/evanMark";

/**
 * The hero name renders the same "Evan" wordmark used by the intro — one
 * continuous monoline pen stroke — drawn on once the intro has revealed the site.
 *
 * The path uses pathLength={1} so the dash maths are resolution-independent and
 * safe to set inline. Default render leaves it fully drawn (visible without JS /
 * for crawlers); a layout effect hides it before first paint when it will
 * animate, then it draws on once the intro completes.
 */
export function HeroWordmark({
  className,
  /** CSS width for the SVG — widen for the oversized hero "spine" (feature 002). */
  widthClamp = "min(100%, 56rem)",
}: {
  className?: string;
  widthClamp?: string;
}) {
  const markRef = useRef<SVGPathElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  // Before first paint: if we're going to animate, hide the stroke so it never
  // flashes fully-drawn. Reduced motion (or the pre-hydration state) leaves it
  // fully drawn and static.
  useLayoutEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    gsap.set(mark, { strokeDashoffset: reduced ? 0 : 1 });
  }, [reduced]);

  // Draw the whole name on in one continuous stroke, once the intro reveal has
  // handed control to the hero.
  useEffect(() => {
    const mark = markRef.current;
    if (!mark || reduced || !introDone) return;
    const ctx = gsap.context(() => {
      gsap.to(mark, {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: "power1.inOut",
      });
    });
    return () => ctx.revert();
  }, [reduced, introDone]);

  return (
    <svg
      viewBox={EVAN_MARK.viewBox}
      aria-hidden
      className={className}
      style={{
        width: widthClamp,
        height: "auto",
        overflow: "visible",
        filter: "drop-shadow(0 0 22px rgba(215,242,74,0.20))",
      }}
    >
      <path
        ref={markRef}
        d={EVAN_MARK.path}
        pathLength={1}
        fill="none"
        stroke={EVAN_MARK.ink}
        strokeWidth={EVAN_MARK.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: 1 }}
      />
    </svg>
  );
}

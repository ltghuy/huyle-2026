"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/**
 * Ambient Orb Field (à la https://gsapvault.com/effects/ambient-orb-field).
 *
 * A calm field of luminous, blurred orbs behind a section. Two motion systems run
 * at once (per the reference):
 *
 *  1. AMBIENT DRIFT — each orb runs three unrelated loops (x, y, opacity) with
 *     deliberately non-matching durations, so the composition never visibly
 *     repeats.
 *  2. DEPTH-WEIGHTED PARALLAX — the pointer slides each orb by an amount set by
 *     its `depth`; near planes travel further than far ones, so the field reads
 *     as stacked depth rather than a flat sheet.
 *
 * Only `transform` + `opacity` animate — the expensive blur is a static texture
 * the compositor reuses. Keyed to the single lime accent on the deep-green ground
 * (`mix-blend-mode: screen`, so the orbs add light).
 *
 * This is a SINGLE page-level layer: rendered once in the root layout as a fixed,
 * viewport-anchored backdrop behind all (transparent) sections — so the ambient
 * field is continuous across the whole page with no per-section seams. Under
 * reduced motion the orbs render as a static composition with no animation.
 */

interface Orb {
  top: string;
  left: string;
  /** diameter as % of the container width */
  size: number;
  color: string;
  /** 0 (far) → 1 (near): weights parallax + drift travel */
  depth: number;
  /** resting opacity */
  opacity: number;
}

const ORBS: Orb[] = [
  { top: "6%", left: "14%", size: 34, color: "#d7f24a", depth: 0.85, opacity: 0.24 },
  { top: "20%", left: "74%", size: 27, color: "#9ae05a", depth: 0.5, opacity: 0.18 },
  { top: "58%", left: "44%", size: 48, color: "#b4d840", depth: 0.2, opacity: 0.12 },
  { top: "70%", left: "22%", size: 24, color: "#e7fb6d", depth: 0.65, opacity: 0.2 },
  { top: "62%", left: "84%", size: 33, color: "#d7f24a", depth: 0.95, opacity: 0.22 },
  { top: "34%", left: "56%", size: 18, color: "#9ae05a", depth: 0.4, opacity: 0.16 },
];

// Furthest a plane travels under the pointer, as % of the orb's own size (the
// nearest plane, depth 1). Blur is a fixed soft texture.
const PARALLAX_PCT = 16;
const ORB_BLUR = 56;

export function OrbField() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    const orbs = gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-orb]"));
    if (!orbs.length) return;

    const ctx = gsap.context(() => {
      const parallax = orbs.map((orb) => {
        const depth = Number(orb.dataset.orbDepth) || 0.5;

        // Ambient drift — three independent loops, non-matching durations so the
        // field never resolves into a pattern. Drift travel scales with depth.
        const reach = 12 + depth * 26;
        gsap.to(orb, {
          x: `random(-${reach}, ${reach})`,
          duration: gsap.utils.random(9, 15),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(orb, {
          y: `random(-${reach}, ${reach})`,
          duration: gsap.utils.random(10, 17),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(orb, {
          opacity: `random(0.55, 1)`,
          duration: gsap.utils.random(6, 11),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        // Depth-weighted pointer parallax rides on xPercent/yPercent, so it
        // composes with the drift's x/y in a single transform.
        return {
          depth,
          xTo: gsap.quickTo(orb, "xPercent", { duration: 0.9, ease: "power3.out" }),
          yTo: gsap.quickTo(orb, "yPercent", { duration: 0.9, ease: "power3.out" }),
        };
      });

      const onMove = (e: PointerEvent) => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1 → 1
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        parallax.forEach((p) => {
          p.xTo(nx * PARALLAX_PCT * p.depth);
          p.yTo(ny * PARALLAX_PCT * p.depth);
        });
      };
      window.addEventListener("pointermove", onMove);
      return () => window.removeEventListener("pointermove", onMove);
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {ORBS.map((o, i) => (
        <div
          key={i}
          data-orb
          data-orb-depth={o.depth}
          className="absolute rounded-full will-change-transform"
          style={{
            top: o.top,
            left: o.left,
            width: `${o.size}%`,
            aspectRatio: "1",
            // Centre the orb on (left, top) via margins so GSAP fully owns the
            // transform (drift x/y + parallax xPercent/yPercent).
            marginLeft: `-${o.size / 2}%`,
            marginTop: `-${o.size / 2}%`,
            background: `radial-gradient(circle at 50% 50%, ${o.color} 0%, ${o.color}00 68%)`,
            opacity: o.opacity,
            filter: `blur(${ORB_BLUR}px)`,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}

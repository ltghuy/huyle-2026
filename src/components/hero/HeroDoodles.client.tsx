"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

/**
 * Hand-drawn CS/IT doodles that fill the hero's empty flanks
 * (à la the DrawSVG demo — https://demos.gsap.com/plugin/drawsvg/).
 *
 * Each doodle is a monoline white SVG that "draws itself on" — GSAP's DrawSVGPlugin
 * sweeps each stroke from 0 → 100%, staggered per shape and per doodle. They loop
 * as a perpetual sketch once the intro hand-off completes (they sit behind the
 * opaque intro scrim until then, so there's no pre-draw flash). Themed to the
 * craft: a `</>` code tag, a terminal window, a debugging bug, a git-branch graph.
 *
 * Decorative only: `aria-hidden`, pointer-events-none, and shown on `lg`+ where
 * the flanks exist. Under reduced motion / no-JS they render fully drawn.
 */

// Softer marker feel: no fixed weight here — each doodle sets its own so the
// apparent thickness stays even across the differently-sized viewBoxes.
const stroke = {
  fill: "none",
  stroke: "#ffffff",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** `</>` — angle brackets around a slash. */
function CodeTag() {
  return (
    <svg viewBox="0 0 160 100" aria-hidden strokeWidth={5.5} {...stroke}>
      <path d="M54 26 L26 50 L54 74" />
      <path d="M106 26 L134 50 L106 74" />
      <path d="M92 20 L68 80" />
    </svg>
  );
}

/** A little terminal window with a `>_` prompt. */
function Terminal() {
  return (
    <svg viewBox="0 0 170 130" aria-hidden strokeWidth={5.5} {...stroke}>
      <path d="M18 26 Q18 18 26 18 L144 18 Q152 18 152 26 L152 104 Q152 112 144 112 L26 112 Q18 112 18 104 Z" />
      <path d="M18 40 L152 40" />
      <path d="M29 29 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
      <path d="M43 29 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
      <path d="M57 29 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" />
      <path d="M34 58 L50 71 L34 84" />
      <path d="M60 86 L86 86" />
    </svg>
  );
}

/** A debugging bug — round body, head, antennae, legs. */
function Bug() {
  return (
    <svg viewBox="0 0 130 130" aria-hidden strokeWidth={4.4} {...stroke}>
      <path d="M65 40 C82 40 92 58 92 82 C92 104 80 116 65 116 C50 116 38 104 38 82 C38 58 48 40 65 40 Z" />
      <path d="M55 34 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0" />
      <path d="M58 26 L50 14" />
      <path d="M72 26 L80 14" />
      <path d="M65 46 L65 112" />
      <path d="M40 66 L20 56" />
      <path d="M38 86 L16 88" />
      <path d="M41 106 L22 116" />
      <path d="M90 66 L110 56" />
      <path d="M92 86 L114 88" />
      <path d="M89 106 L108 116" />
    </svg>
  );
}

/** A git-branch graph — a trunk with one branch peeling off to a node. */
function GitBranch() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden strokeWidth={4.2} {...stroke}>
      <path d="M40 31 L40 119" />
      <path d="M40 74 C40 92 62 82 79 82" />
      <path d="M33 24 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" />
      <path d="M33 126 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" />
      <path d="M79 75 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" />
    </svg>
  );
}

/**
 * Each doodle: the shape + where it frames the two-line title (lg+ only).
 * Positioned within the same centered `max-w-6xl` column as the type, so they
 * hug the four corners of "Software / Engineer" at any width. Axis-aligned
 * (no tilt); faint + behind the type so it never competes.
 */
const DOODLES = [
  { Shape: CodeTag, className: "left-[12%] top-[14%] w-32 xl:w-40" },
  { Shape: Terminal, className: "right-[12%] top-[13%] w-32 xl:w-40" },
  { Shape: Bug, className: "left-[14%] top-[41%] w-24 xl:w-28" },
  { Shape: GitBranch, className: "right-[14%] top-[42%] w-24 xl:w-28" },
];

export function HeroDoodles() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.registerPlugin(DrawSVGPlugin);
    const paths = el.querySelectorAll("path");

    // Reduced motion → just show them, fully drawn.
    if (reduced) {
      gsap.set(paths, { drawSVG: "100%" });
      return;
    }
    // Keep them un-drawn (hidden behind the intro scrim) until the intro hands off.
    if (!introDone) {
      gsap.set(paths, { drawSVG: "0%" });
      return;
    }

    // Perpetual sketch: each doodle draws itself on, holds, then un-draws
    // (yoyo) — forever. Durations/delays are varied per doodle so they fall out
    // of phase and the flanks are always mid-sketch somewhere.
    const svgs = gsap.utils.toArray<SVGSVGElement>(el.querySelectorAll("svg"));
    const tweens = svgs.map((svg, i) =>
      gsap.fromTo(
        svg.querySelectorAll("path"),
        { drawSVG: "0%" },
        {
          drawSVG: "100%",
          duration: 1.3 + i * 0.25,
          ease: "power1.inOut",
          stagger: 0.12,
          repeat: -1,
          yoyo: true,
          repeatDelay: 1.1,
          delay: i * 0.6,
        },
      ),
    );
    return () => tweens.forEach((t) => t.kill());
  }, [reduced, introDone]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
      // Soft-marker feel: a touch of blur + a faint white bloom around the ink.
      style={{ filter: "blur(0.5px) drop-shadow(0 0 3px rgba(255,255,255,0.35))" }}
    >
      {/* Same centered column as the title, so the doodles track the words. */}
      <div className="relative mx-auto h-full w-full max-w-6xl opacity-40 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full">
        {DOODLES.map(({ Shape, className }) => (
          <span key={Shape.name} className={`absolute ${className}`}>
            <Shape />
          </span>
        ))}
      </div>
    </div>
  );
}

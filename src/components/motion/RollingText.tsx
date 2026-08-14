"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

/**
 * 3D "rolling text" effect (after the GSAP demo at
 * demos.gsap.com/demo/rolling-text). The word is stacked as several identical
 * copies; each copy is split into characters that rotate on the X axis around a
 * Z-offset origin, so the letters appear to roll continuously over the surface
 * of a horizontal cylinder. The phased copies keep a face of the word readable
 * at all times.
 *
 * Renders the copies aria-hidden — the accessible name comes from the parent
 * heading's aria-label. Under reduced motion the copies simply overlap as static
 * text (no rotation), which reads as the plain word.
 */

// One key per rendered copy (stable, not array-index based). A single copy keeps
// the name on one line — no trailing "next iteration" behind the word.
const COPY_KEYS = ["c0"];

// Number of extra letter turns before the name settles flat (repeat count).
const ROLL_TURNS = 2;

export function RollingText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const tubeRef = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  useEffect(() => {
    const tube = tubeRef.current;
    // Wait for the intro to reveal the site, then roll in once (see settle below)
    // instead of animating unseen behind the overlay / rolling forever.
    if (!tube || reduced || !introDone) return;

    gsap.registerPlugin(SplitText);

    let splits: SplitText[] = [];
    const ctx = gsap.context(() => {
      const lines = Array.from(tube.querySelectorAll<HTMLElement>(".rt-line"));
      splits = lines.map(
        (line) => new SplitText(line, { type: "chars", charsClass: "rt-char" }),
      );

      // The rotation axis sits behind the text; the distance sets the cylinder
      // radius (and how far the letters swing as they roll).
      const height = lines[0]?.clientHeight || tube.clientHeight || 100;
      const depth = -Math.max(height * 0.6, 66);
      const transformOrigin = `50% 50% ${depth}px`;
      gsap.set(lines, { perspective: 900, transformStyle: "preserve-3d" });

      const allChars = splits.flatMap((s) => s.chars);
      gsap.set(allChars, { backfaceVisibility: "hidden" });

      // Roll the letters over a few times as a travelling wave (per-letter
      // stagger), then settle them flat (rotationX 0) so the name comes to rest —
      // readable and still — instead of rolling forever.
      const tl = gsap.timeline();
      tl.fromTo(
        allChars,
        { rotationX: -90 },
        {
          rotationX: 90,
          duration: 0.8,
          ease: "none",
          repeat: ROLL_TURNS,
          transformOrigin,
          stagger: { each: 0.08, from: "start" },
        },
      ).to(
        allChars,
        {
          rotationX: 0,
          duration: 0.5,
          ease: "power3.out",
          transformOrigin,
          stagger: { each: 0.04, from: "start" },
        },
        ">-0.1",
      );
    }, tube);

    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
    };
  }, [reduced, introDone, text]);

  return (
    <span
      ref={tubeRef}
      aria-hidden
      className={className}
      style={{
        display: "inline-grid",
        lineHeight: 1,
        paddingBlock: "0.55em", // room for the letters' vertical swing
      }}
    >
      {COPY_KEYS.map((k) => (
        <span
          key={k}
          className="rt-line"
          style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}
        >
          {text}
        </span>
      ))}
    </span>
  );
}

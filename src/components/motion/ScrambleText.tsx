"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";
import { useIntroComplete } from "@/lib/useIntroComplete";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

interface ScrambleTextProps {
  text: string;
  className?: string;
  /** ms before the scramble starts */
  delay?: number;
  /** total scramble duration in ms */
  duration?: number;
  /** hold off until the first-load intro has revealed the site */
  waitForIntro?: boolean;
}

/**
 * Decode-from-static text effect. The final text is rendered on the server and
 * as the initial DOM (SEO + no-JS + reduced-motion friendly); on the client,
 * when motion is allowed, it scrambles then resolves to the final string.
 */
export function ScrambleText({
  text,
  className,
  delay = 0,
  duration = 1200,
  waitForIntro = false,
}: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const introDone = useIntroComplete();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (waitForIntro && !introDone) return;

    const chars = [...text];
    let raf = 0;
    let start = 0;

    // Per-character decode: each glyph resolves at its own randomized threshold
    // (à la the "text decode" reference), so the string clears in a scattered
    // order rather than a straight left-to-right wipe. Spaces stay fixed.
    const thresholds = chars.map(() => 0.15 + Math.random() * 0.7);
    const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

    // Paint a fully-scrambled frame immediately to avoid a flash of final text.
    el.textContent = chars.map((ch) => (ch === " " ? " " : glyph())).join("");

    const frame = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === " ") out += " ";
        else if (progress >= thresholds[i]) out += chars[i];
        else out += glyph();
      }
      el.textContent = out;
      if (progress < 1) raf = requestAnimationFrame(frame);
      else el.textContent = text;
    };

    const timeout = window.setTimeout(() => {
      raf = requestAnimationFrame(frame);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, delay, duration, reduced, waitForIntro, introDone]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

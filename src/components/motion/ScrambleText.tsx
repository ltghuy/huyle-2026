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

    const scrambleOnce = () => {
      let out = "";
      for (const ch of chars) out += ch === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      return out;
    };

    // Paint a fully-scrambled frame immediately to avoid a flash of final text.
    el.textContent = scrambleOnce();

    const frame = (now: number) => {
      if (!start) start = now;
      const progress = Math.min((now - start) / duration, 1);
      const revealCount = Math.floor(progress * chars.length);
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === " ") out += " ";
        else if (i < revealCount) out += chars[i];
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
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

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

/**
 * Wraps the experience rows and draws the center timeline: a faint base line, a
 * bright "active" line that fills top→down, and a glowing dot that travels along
 * it as the visitor scrolls (GSAP ScrollTrigger scrub). Desktop only — mobile
 * renders the rows without the line. Under reduced motion the line is shown full
 * with the dot resting at the end.
 */
export function AnimatedTimeline({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const activeLine = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = container.current;
    if (!el) return;

    const setProgress = (p: number) => {
      const pct = `${p * 100}%`;
      if (activeLine.current) activeLine.current.style.height = pct;
      if (dot.current) dot.current.style.top = pct;
      if (halo.current) halo.current.style.top = pct;
    };

    if (reducedMotion) {
      setProgress(1);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 65%",
      end: "bottom 65%",
      scrub: true,
      onUpdate: (self) => setProgress(self.progress),
    });
    setProgress(0);

    return () => st.kill();
  }, [reducedMotion]);

  return (
    <div ref={container} className="relative mt-16 md:mt-24">
      {/* faint base line (desktop) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-accent/10 md:block"
      />
      {/* bright active line — brightest near the dot, fading toward the top */}
      <div
        ref={activeLine}
        aria-hidden
        style={{ height: 0 }}
        className="pointer-events-none absolute left-1/2 top-0 hidden w-px -translate-x-1/2 bg-gradient-to-b from-accent/20 to-accent-bright md:block"
      />
      {/* soft ember halo — the burning-fuse glow, travels with the dot */}
      <div
        ref={halo}
        aria-hidden
        style={{
          top: 0,
          background:
            "radial-gradient(circle, rgba(215,242,74,0.28) 0%, rgba(215,242,74,0.10) 35%, transparent 70%)",
        }}
        className="ember-glow pointer-events-none absolute left-1/2 hidden size-72 rounded-full blur-[8px] md:block"
      />
      {/* the ember core */}
      <div
        ref={dot}
        aria-hidden
        style={{
          top: 0,
          boxShadow:
            "0 0 8px 2px rgba(231,251,109,0.9), 0 0 20px 6px rgba(215,242,74,0.55), 0 0 44px 14px rgba(215,242,74,0.25)",
        }}
        className="pointer-events-none absolute left-1/2 hidden size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-bright md:block"
      />

      <div className="space-y-16 md:space-y-28">{children}</div>
    </div>
  );
}

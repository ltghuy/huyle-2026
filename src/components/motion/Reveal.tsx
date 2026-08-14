"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** starting vertical offset in px */
  y?: number;
  /** delay in seconds */
  delay?: number;
}

/**
 * Scroll-in fade/translate wrapper. Content is visible by default (no-JS safe);
 * when motion is allowed, JS hides it and reveals it as it enters the viewport.
 * Under reduced motion it stays visible with no transform.
 */
export function Reveal({ children, className, y = 24, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          delay,
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [reduced, y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

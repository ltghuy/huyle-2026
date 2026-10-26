"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

interface MagneticLinkProps {
  children: ReactNode;
  href: string;
  className?: string;
  /** pull factor (0–1) toward the pointer */
  strength?: number;
  target?: string;
  rel?: string;
  "aria-label"?: string;
}

/**
 * Anchor that magnetically follows the pointer on hover. Disabled under reduced
 * motion. Uses gsap.quickTo so the transient position never triggers re-renders.
 */
export function MagneticLink({
  children,
  href,
  className,
  strength = 0.3,
  target,
  rel,
  ...rest
}: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "elastic.out(1,0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "elastic.out(1,0.4)" });

    const handleMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * strength);
      yTo((e.clientY - r.top - r.height / 2) * strength);
    };
    const handleLeave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [reduced, strength]);

  return (
    <a ref={ref} href={href} className={className} target={target} rel={rel} {...rest}>
      {children}
    </a>
  );
}

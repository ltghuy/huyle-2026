"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks scroll progress (0–1) through the first viewport as a ref, so the 3D
 * scene can read it every frame without triggering React re-renders. A single
 * passive listener drives it.
 */
export function useScrollProgress(): RefObject<number> {
  const ref = useRef(0);

  useEffect(() => {
    const update = () => {
      const max = window.innerHeight || 1;
      ref.current = Math.min(Math.max(window.scrollY / max, 0), 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return ref;
}

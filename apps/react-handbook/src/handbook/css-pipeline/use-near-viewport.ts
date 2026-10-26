"use client";

import { useEffect, useRef, useState } from "react";

/** Becomes true once the element is within `margin` of the viewport, and stays true. Used to download a tool only when its demo is reached. */
export function useNearViewport<T extends Element>(margin = "300px") {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: margin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, margin]);
  return { ref, near };
}

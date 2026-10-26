"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tracks whether an element is within (or near) the viewport, so expensive
 * continuous work — a WebGL render loop, a rAF ticker — can pause while the
 * element is scrolled away. `rootMargin` lets callers wake the work slightly
 * before it scrolls into view (e.g. "300px 0px") to avoid a blank first frame.
 *
 * Returns a **callback ref** (not a RefObject) so the observer attaches the
 * moment the node mounts — robust even when the target only appears on a later
 * render (e.g. a WebGL branch that mounts after client-side feature detection).
 * Defaults to visible when IntersectionObserver is unavailable, so content is
 * never left frozen.
 */
export function useInViewport<T extends Element>(
  rootMargin = "0px",
): [(node: T | null) => void, boolean] {
  const [inView, setInView] = useState(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const rafRef = useRef(0);

  const ref = useCallback(
    (node: T | null) => {
      ioRef.current?.disconnect();
      ioRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (!node) return;
      if (typeof IntersectionObserver === "undefined") {
        rafRef.current = requestAnimationFrame(() => setInView(true));
        return;
      }
      const io = new IntersectionObserver(
        ([entry]) => setInView(entry.isIntersecting),
        { rootMargin },
      );
      io.observe(node);
      ioRef.current = io;
    },
    [rootMargin],
  );

  return [ref, inView];
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query (e.g. `(min-width: 1024px)`). Uses useSyncExternalStore
 * so it stays correct across viewport changes without an effect. Mirrors
 * usePrefersReducedMotion. Returns `false` on the server and first paint, then the
 * real match after hydration — so gate *enhancements* (desktop-only effects) on a
 * truthy result, letting the mobile/static layout be the safe default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

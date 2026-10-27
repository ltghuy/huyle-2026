"use client";

import { useEffect } from "react";

/**
 * Starts auto sync for as long as the app is open (AC-048). The sync client is
 * loaded after hydration, so it stays out of the first page load.
 */
export function SyncRunner() {
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import("@/sync/sync-client")
      .then(({ startAutoSync }) => {
        if (!cancelled) stop = startAutoSync();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return null;
}

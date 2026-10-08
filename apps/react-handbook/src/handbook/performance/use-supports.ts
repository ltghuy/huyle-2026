"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Whether this browser can observe a performance entry type. The server
 * render assumes yes, so the first client render matches it.
 */
export function useSupportsEntryType(type: string) {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes(type),
    () => true,
  );
}

/** Whether this browser has Web Workers (assumed yes on the server). */
export function useSupportsWorkers() {
  return useSyncExternalStore(noopSubscribe, () => typeof Worker !== "undefined", () => true);
}

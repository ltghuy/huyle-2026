"use client";

import { useSyncExternalStore } from "react";

let cached: boolean | null = null;

function detect(): boolean {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement("canvas");
    cached = !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    cached = false;
  }
  return cached;
}

function subscribe() {
  return () => {};
}

/**
 * WebGL availability. Detected synchronously on the client via
 * useSyncExternalStore (server snapshot = false → poster during SSR, then the
 * client re-renders with the real value). No effect, no hydration warning.
 */
export function useWebGLAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => detect(),
    () => false,
  );
}

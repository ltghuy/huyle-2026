"use client";

import { useSyncExternalStore } from "react";

declare global {
  interface Window {
    /** Set true once the first-load intro overlay has finished revealing the site. */
    __introComplete?: boolean;
  }
}

const EVENT = "intro:complete";

/** Fire once the intro overlay has revealed the site (see IntroOverlay). */
export function markIntroComplete() {
  if (typeof window === "undefined") return;
  window.__introComplete = true;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

function getSnapshot() {
  return typeof window !== "undefined" && window.__introComplete === true;
}

function getServerSnapshot() {
  return false;
}

/**
 * Tracks whether the first-load intro has finished. Hero animations gate on this
 * so they play *as the site is revealed* (and once), rather than running unseen
 * behind the overlay and competing with each other.
 */
export function useIntroComplete(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

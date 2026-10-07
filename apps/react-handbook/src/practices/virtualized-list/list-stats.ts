// Live numbers for the stats line. A tiny store of its own, so updating a
// number re-renders only the stats line, never the list.

import { useSyncExternalStore } from "react";

export type UpdateCause = "mode" | "rows" | "filter" | "sort" | "scroll" | "jump" | "settings";

export type ListStats = {
  onPage: number;
  inList: number;
  /** 0-based, inclusive; null when the list is empty. */
  visibleStart: number | null;
  visibleEnd: number | null;
  /** Time from the triggering event to the list being laid out. */
  lastUpdateMs: number | null;
  cause: UpdateCause | null;
  /** Rows with a measured height (virtualized only). */
  measured: number | null;
};

const INITIAL: ListStats = {
  onPage: 0,
  inList: 0,
  visibleStart: null,
  visibleEnd: null,
  lastUpdateMs: null,
  cause: null,
  measured: null,
};

let stats = INITIAL;
let pending: { start: number; cause: UpdateCause } | null = null;
const listeners = new Set<() => void>();

/** Starts the update clock; the list stops it once it has been laid out. */
export function markUpdate(cause: UpdateCause) {
  pending = { start: performance.now(), cause };
}

export const listStats = {
  set(patch: Partial<ListStats>) {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof ListStats)[]) {
      if (patch[key] !== stats[key]) changed = true;
    }
    if (!changed) return;
    stats = { ...stats, ...patch };
    for (const listener of listeners) listener();
  },
  /** Call after layout: records the time since the last `markUpdate`. */
  finishUpdate() {
    if (!pending) return;
    const { start, cause } = pending;
    pending = null;
    this.set({ lastUpdateMs: performance.now() - start, cause });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useListStats() {
  return useSyncExternalStore(subscribe, () => stats, () => INITIAL);
}

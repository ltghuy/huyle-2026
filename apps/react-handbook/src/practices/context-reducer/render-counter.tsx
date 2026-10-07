"use client";

// Counts committed renders of the shop's components without causing any:
// a layout effect writes the count straight into a badge. Renders between a
// dispatch and the next frame form one report. The components in it flash
// (outline and badge) and then fade back, so one action's effect is visible
// at a glance; the scoreboard and history keep the record.

import { RefreshCw } from "lucide-react";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

export type Strategy = "single" | "split" | "selector";

export type RenderReport = {
  id: number;
  action: string;
  strategy: Strategy;
  renders: number;
  /** Counted components mounted when the action finished. */
  mounted: number;
  names: string[];
};

type Counter = { n: number; name: string; badge: HTMLSpanElement | null };

/** Latest render count per action type and strategy, for the scoreboard. */
type Scores = Partial<Record<string, Partial<Record<Strategy, number>>>>;

export type RenderSnapshot = { reports: RenderReport[]; scores: Scores };

const MAX_REPORTS = 10;
/** How long the flash stays before it fades out (the fade is CSS). */
const FLASH_MS = 1500;
const EMPTY: RenderSnapshot = { reports: [], scores: {} };

/** Every mounted counter, so a reset can zero them without re-rendering. */
const counters = new Set<Counter>();
let snapshot: RenderSnapshot = EMPTY;
/** Components (not commits) that rendered for the current action. */
let current: { action: string; strategy: Strategy; rendered: Set<Counter> } | null = null;
let flashed: Counter[] = [];
let frame = 0;
let flashTimer: ReturnType<typeof setTimeout> | undefined;
let nextReport = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** The component root: the nearest element marked `data-render-root`. */
function rootOf(counter: Counter) {
  return counter.badge?.closest<HTMLElement>("[data-render-root]") ?? null;
}

/** Flashes the badge and the component root; cleared by a timer so it fades. */
function setFlash(counter: Counter, on: boolean) {
  for (const el of [counter.badge, rootOf(counter)]) {
    if (!el) continue;
    if (on) el.dataset.flash = "true";
    else delete el.dataset.flash;
  }
}

function clearFlash(counters: Iterable<Counter>) {
  clearTimeout(flashTimer);
  for (const counter of counters) setFlash(counter, false);
}

/** Called by the dispatch wrapper: renders until the next frame belong to this action. */
export function beginAction(action: string, strategy: Strategy) {
  if (frame) finish();
  current = { action, strategy, rendered: new Set() };
  frame = requestAnimationFrame(finish);
}

function finish() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  if (!current) return;
  const done = current;
  current = null;
  clearFlash(flashed);
  const rendered = [...done.rendered];
  flashed = rendered;
  for (const counter of rendered) setFlash(counter, true);
  flashTimer = setTimeout(() => clearFlash(rendered), FLASH_MS);
  const report: RenderReport = {
    id: nextReport++,
    action: done.action,
    strategy: done.strategy,
    renders: rendered.length,
    mounted: counters.size,
    names: rendered.map((c) => c.name),
  };
  snapshot = {
    reports: [report, ...snapshot.reports].slice(0, MAX_REPORTS),
    scores: {
      ...snapshot.scores,
      [report.action]: { ...snapshot.scores[report.action], [report.strategy]: report.renders },
    },
  };
  emit();
}

export function resetCounters() {
  for (const counter of counters) {
    counter.n = 0;
    if (counter.badge) counter.badge.textContent = "0";
  }
  clearFlash(counters);
  flashed = [];
  current = null;
  snapshot = EMPTY;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRenderReports() {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);
}

/**
 * Attach the returned ref to a <RenderBadge> inside an element marked
 * `data-render-root`. Every commit of the calling component counts.
 */
export function useRenderCount(name: string) {
  const badge = useRef<HTMLSpanElement>(null);
  const counter = useRef<Counter>({ n: 0, name, badge: null });

  useLayoutEffect(() => {
    const c = counter.current;
    counters.add(c);
    return () => {
      counters.delete(c);
    };
  }, []);

  // No dependencies: runs after every commit of the component.
  useLayoutEffect(() => {
    const c = counter.current;
    c.n++;
    c.badge = badge.current;
    c.name = name;
    current?.rendered.add(c);
    if (badge.current) badge.current.textContent = String(c.n);
  });

  return badge;
}

/**
 * Outline for a counted component; `data-flash` is set by the registry. It
 * appears at once and fades out when the flag is removed.
 */
export const RENDER_ROOT =
  "rounded-lg outline-2 outline-offset-2 outline-transparent transition-[outline-color] duration-700 motion-reduce:transition-none data-[flash=true]:transition-none data-[flash=true]:outline-[color-mix(in_oklch,var(--warning),black_25%)] dark:data-[flash=true]:outline-warning";

export function RenderBadge({ badgeRef, label }: { badgeRef: React.RefObject<HTMLSpanElement | null>; label: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded border px-1 font-mono text-xs text-foreground/75 tabular-nums transition-colors duration-700 motion-reduce:transition-none has-data-[flash=true]:border-[color-mix(in_oklch,var(--warning),black_25%)] has-data-[flash=true]:bg-warning/20 has-data-[flash=true]:font-semibold has-data-[flash=true]:text-foreground has-data-[flash=true]:transition-none dark:has-data-[flash=true]:border-warning"
      title={`${label}: renders`}
    >
      <RefreshCw aria-hidden className="size-3" />
      <span className="sr-only">{label} renders:</span>
      <span ref={badgeRef}>0</span>
    </span>
  );
}

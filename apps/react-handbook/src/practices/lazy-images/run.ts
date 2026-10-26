import type { Photo, PhotoCount } from "@/server/practices/lazy-images/photos.schema";

import { LazyLoader } from "./lazy-loader";
import { srcSetFor } from "./photos-api";
import { RunMetrics, type MetricsSnapshot } from "./run-metrics";

export type Strategy = "hand-built" | "native" | "eager";
export type PlaceholderKind = "blur" | "color" | "skeleton" | "none";

export const STRATEGIES: { value: Strategy; label: string; hint: string }[] = [
  { value: "hand-built", label: "Hand-built", hint: "IntersectionObserver, preload band, start delay, cancel, decode" },
  { value: "native", label: "Native lazy", hint: 'loading="lazy": the browser decides when' },
  { value: "eager", label: "Eager", hint: "Every image requested at once" },
];

export const STRATEGY_LABEL: Record<Strategy, string> = {
  "hand-built": "Hand-built",
  native: "Native lazy",
  eager: "Eager",
};

/** Settings that shape a run; changing any of them starts a new run. */
export type GallerySettings = {
  strategy: Strategy;
  count: PhotoCount;
  placeholder: PlaceholderKind;
  preloadPx: number;
  delayMs: number;
  priority: number;
  reserve: boolean;
};

export const DEFAULT_SETTINGS: GallerySettings = {
  strategy: "hand-built",
  count: 48,
  placeholder: "blur",
  preloadPx: 200,
  delayMs: 150,
  priority: 3,
  reserve: true,
};

export type Run = {
  id: string;
  settings: GallerySettings;
  loader: LazyLoader;
  metrics: RunMetrics;
};

export type ResultRow = {
  strategy: Strategy;
  run: string;
  settings: GallerySettings;
  metrics: MetricsSnapshot;
};

function newRunId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14).padEnd(8, "0");
}

/** Created in event handlers and effects, never during render. */
export function createRun(settings: GallerySettings, photos: Photo[]): Run {
  const id = newRunId();
  const metrics = new RunMetrics(id, photos.length, new Map(photos.map((p) => [p.id, p.title])));
  const loader = new LazyLoader({
    observe: settings.strategy === "hand-built",
    rootMarginPx: settings.preloadPx,
    delayMs: settings.delayMs,
    srcSet: (key, attempt) => srcSetFor(key, id, attempt),
    onEvent: metrics.handle,
  });
  return { id, settings, loader, metrics };
}

/** Cancels the run's downloads and resolves with its final numbers. */
export function endRun(run: Run): Promise<MetricsSnapshot> {
  run.loader.destroy();
  return run.metrics.finish();
}

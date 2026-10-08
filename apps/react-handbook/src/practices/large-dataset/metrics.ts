import { useSyncExternalStore } from "react";

// Measurements live outside React: recording a number must never re-render
// the board it measures. The panel reads a snapshot refreshed 4× a second.
//
// Render time = from the start of an update (the event or feed update that
// caused it, or the board starting a render on its own) to the first layout
// effect after the commit. `<Profiler>` would be the usual tool, but its
// callback doesn't run in production builds without the profiling build.

const WINDOW = 20; // renders averaged in the panel
const KEEP = 300;
const LONG_TASK_WINDOW_MS = 10_000;
export const SLOW_RENDER_MS = 1_000;
const REFRESH_MS = 250;

type RenderSample = { at: number; ms: number; rows: number };

export type MetricsSnapshot = {
  lastRenderMs: number | null;
  avgRenderMs: number | null;
  maxRenderMs: number | null;
  rendersPerSec: number;
  rowsRendered: number | null;
  rowsInPage: number;
  deriveMs: number | null;
  updateMs: number | null;
  inputLastMs: number | null;
  inputMaxMs: number | null;
  fps: number | null;
  longTasks: number;
  blockingMs: number;
  longTaskSupported: boolean;
};

export type Recording = {
  renders: RenderSample[];
  inputs: number[];
  frames: number;
  startedAt: number;
  hiddenMs: number;
};

export type RecordingSummary = {
  medianRenderMs: number | null;
  p95RenderMs: number | null;
  medianRowsRendered: number | null;
  maxInputMs: number | null;
  longTasks: number | null;
  blockingMs: number | null;
  fps: number;
};

const now = () => performance.now();

let renderStart: number | null = null;
let rowCounter = 0;
let renders: RenderSample[] = [];
let rowsInPage = 0;
let deriveMs: number | null = null;
let updateMs: number | null = null;
let inputs: number[] = [];
let fps: number | null = null;
let longTasks: { at: number; duration: number }[] = [];
let recording: Recording | null = null;
let recordingLongTasks: { duration: number }[] = [];
const slowListeners = new Set<(ms: number) => void>();

// --- render timing ------------------------------------------------------------

export const renderTimer = {
  /** An event or feed update is about to cause a render: time from here. */
  start() {
    renderStart = now();
  },
  /** A component is rendering with no update started (e.g. a deferred render). */
  startIfIdle() {
    renderStart ??= now();
  },
  /** First layout effect after a commit: the update is on screen (before paint). */
  end() {
    if (renderStart === null) return;
    const ms = now() - renderStart;
    renderStart = null;
    const sample = { at: now(), ms, rows: rowCounter };
    rowCounter = 0;
    renders.push(sample);
    if (renders.length > KEEP) renders = renders.slice(-KEEP);
    recording?.renders.push(sample);
    if (ms > SLOW_RENDER_MS) for (const listener of slowListeners) listener(ms);
  },
};

/** Called by every row render, so `memo` savings show up as a number. */
export function countRowRender() {
  rowCounter++;
}

export function setRowsInPage(count: number) {
  rowsInPage = count;
}

/** Times `work`, storing the result as the last derive (filter + sort) time. */
export function timeDerive<T>(work: () => T): T {
  const started = now();
  const result = work();
  deriveMs = now() - started;
  return result;
}

export function timeUpdate<T>(work: () => T): T {
  const started = now();
  const result = work();
  updateMs = now() - started;
  return result;
}

export function onSlowRender(listener: (ms: number) => void) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

// --- typing delay -------------------------------------------------------------

/**
 * Keystroke → next frame. Stamped on keydown; the keystroke's own render runs
 * in the same task (or the next one), so the next animation frame is the one
 * that paints it. Waiting for a task *after* that frame would also count
 * unrelated work that happens to run next (such as a long background commit).
 */
export function markInput() {
  const started = now();
  requestAnimationFrame(() => {
    const ms = now() - started;
    inputs.push(ms);
    if (inputs.length > KEEP) inputs = inputs.slice(-KEEP);
    recording?.inputs.push(ms);
  });
}

// --- frames and long tasks ------------------------------------------------------

let frameHandle = 0;
let frames = 0;
let frameWindowStart = 0;
let hiddenSince: number | null = null;
let observer: PerformanceObserver | null = null;
const longTaskSupported: boolean =
  typeof PerformanceObserver !== "undefined" && !!PerformanceObserver.supportedEntryTypes?.includes("longtask");

function frame(time: number) {
  frames++;
  if (recording) recording.frames++;
  if (time - frameWindowStart >= 1000) {
    fps = (frames * 1000) / (time - frameWindowStart);
    frames = 0;
    frameWindowStart = time;
  }
  frameHandle = requestAnimationFrame(frame);
}

function handleVisibility() {
  if (document.hidden) {
    hiddenSince = now();
    return;
  }
  // Hidden tabs get no frames: start a fresh window and exclude the gap.
  if (hiddenSince !== null && recording) recording.hiddenMs += now() - hiddenSince;
  hiddenSince = null;
  frames = 0;
  frameWindowStart = now();
}

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let starts = 0;

/** Starts the frame loop, long-task observer and panel refresh; returns stop. */
export function startMonitoring() {
  starts++;
  if (starts === 1) {
    frameWindowStart = now();
    frameHandle = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", handleVisibility);
    if (longTaskSupported) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push({ at: entry.startTime + entry.duration, duration: entry.duration });
          if (recording) recordingLongTasks.push({ duration: entry.duration });
        }
      });
      observer.observe({ type: "longtask" });
    }
    refreshTimer = setInterval(refresh, REFRESH_MS);
  }
  return () => {
    starts--;
    if (starts > 0) return;
    cancelAnimationFrame(frameHandle);
    document.removeEventListener("visibilitychange", handleVisibility);
    observer?.disconnect();
    observer = null;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
    recording = null;
  };
}

// --- benchmark recording --------------------------------------------------------

export function startRecording() {
  recording = { renders: [], inputs: [], frames: 0, startedAt: now(), hiddenMs: 0 };
  recordingLongTasks = [];
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export function stopRecording(): RecordingSummary | null {
  const rec = recording;
  recording = null;
  if (!rec) return null;
  const seconds = Math.max(0.001, (now() - rec.startedAt - rec.hiddenMs) / 1000);
  return {
    medianRenderMs: percentile(rec.renders.map((r) => r.ms), 0.5),
    p95RenderMs: percentile(rec.renders.map((r) => r.ms), 0.95),
    medianRowsRendered: percentile(rec.renders.map((r) => r.rows), 0.5),
    maxInputMs: rec.inputs.length ? Math.max(...rec.inputs) : null,
    longTasks: longTaskSupported ? recordingLongTasks.length : null,
    blockingMs: longTaskSupported ? recordingLongTasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0) : null,
    fps: rec.frames / seconds,
  };
}

// --- panel snapshot ---------------------------------------------------------------

export function resetMetrics() {
  renders = [];
  inputs = [];
  longTasks = [];
  deriveMs = null;
  updateMs = null;
  rowCounter = 0;
  refresh();
}

const EMPTY: MetricsSnapshot = {
  lastRenderMs: null, avgRenderMs: null, maxRenderMs: null, rendersPerSec: 0, rowsRendered: null,
  rowsInPage: 0, deriveMs: null, updateMs: null, inputLastMs: null, inputMaxMs: null, fps: null,
  longTasks: 0, blockingMs: 0, longTaskSupported: false,
};

let snapshot = EMPTY;
const listeners = new Set<() => void>();

function refresh() {
  const t = now();
  const recent = renders.slice(-WINDOW);
  longTasks = longTasks.filter((task) => t - task.at < LONG_TASK_WINDOW_MS);
  const last = renders.at(-1);
  snapshot = {
    lastRenderMs: last?.ms ?? null,
    avgRenderMs: recent.length ? recent.reduce((s, r) => s + r.ms, 0) / recent.length : null,
    maxRenderMs: recent.length ? Math.max(...recent.map((r) => r.ms)) : null,
    rendersPerSec: renders.filter((r) => t - r.at < 1000).length,
    rowsRendered: last?.rows ?? null,
    rowsInPage,
    deriveMs,
    updateMs,
    inputLastMs: inputs.at(-1) ?? null,
    inputMaxMs: inputs.length ? Math.max(...inputs) : null,
    fps,
    longTasks: longTasks.length,
    blockingMs: longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0),
    longTaskSupported,
  };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

export function useMetrics() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

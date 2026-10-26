import { useSyncExternalStore } from "react";

import type { SortColumn } from "./derive";
import { markInput, startRecording, stopRecording, type RecordingSummary } from "./metrics";

// A fixed scenario, played through the same handlers as the user, so runs
// on different configurations are comparable.

export type Optimizations = {
  windowing: boolean;
  memoRows: boolean;
  cachedDerive: boolean;
  deferredFilter: boolean;
  indexedUpdates: boolean;
};

export const BENCHMARK_FEED = { perSecond: 4, batch: 200, seed: 42 } as const;

export type BenchmarkApi = {
  setQuery: (text: string) => void;
  sortBy: (column: SortColumn) => void;
  /** Selects the n-th row currently on the board. */
  selectRow: (n: number) => void;
  /** Scrolls the board to a fraction of its height (0 = top, 1 = bottom). */
  scrollTo: (fraction: number) => void;
  /** Runs the feed with the fixed benchmark settings, or stops it. */
  setBenchmarkFeed: (on: boolean) => void;
};

type Step = { label: string; run: (api: BenchmarkApi, wait: (ms: number) => Promise<void>) => Promise<void> };

const TYPE_DELAY_MS = 150;

const STEPS: Step[] = [
  {
    label: "Typing “tech”",
    async run(api, wait) {
      let text = "";
      for (const char of "tech") {
        text += char;
        markInput();
        api.setQuery(text);
        await wait(TYPE_DELAY_MS);
      }
      await wait(300);
    },
  },
  {
    label: "Clearing the filter",
    async run(api, wait) {
      for (let text = "tech"; text.length > 0; ) {
        text = text.slice(0, -1);
        markInput();
        api.setQuery(text);
        await wait(TYPE_DELAY_MS);
      }
      await wait(300);
    },
  },
  {
    label: "Sorting by Change %, then Volume",
    async run(api, wait) {
      api.sortBy("change");
      await wait(400);
      api.sortBy("volume");
      await wait(400);
    },
  },
  {
    label: "Selecting rows",
    async run(api, wait) {
      for (const n of [0, 2, 4]) {
        api.selectRow(n);
        await wait(250);
      }
    },
  },
  {
    label: "Scrolling the board",
    async run(api, wait) {
      for (const fraction of [0.1, 0.25, 0.5, 0.75, 1, 0.5, 0]) {
        api.scrollTo(fraction);
        await wait(200);
      }
    },
  },
  {
    label: "Live feed (3 s)",
    async run(api, wait) {
      api.setBenchmarkFeed(true);
      await wait(3000);
      api.setBenchmarkFeed(false);
    },
  },
];

export const STEP_COUNT = STEPS.length;

export type BenchmarkResult = RecordingSummary & {
  id: number;
  config: Optimizations;
  rows: number;
};

class AbortError extends Error {}

function waiter(signal: AbortSignal) {
  return (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(new AbortError());
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new AbortError());
      }, { once: true });
    });
}

/** Resolves with the summary, or null when stopped. */
export async function runBenchmark(
  api: BenchmarkApi,
  signal: AbortSignal,
  onStep: (index: number, label: string) => void,
): Promise<RecordingSummary | null> {
  const wait = waiter(signal);
  startRecording();
  try {
    for (const [i, step] of STEPS.entries()) {
      onStep(i, step.label);
      await step.run(api, wait);
    }
    return stopRecording();
  } catch (error) {
    stopRecording();
    if (error instanceof AbortError) return null;
    throw error;
  } finally {
    api.setBenchmarkFeed(false);
  }
}

// --- results (module-level: kept while navigating within the app) ---------------

const MAX_RESULTS = 6;
let results: BenchmarkResult[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: BenchmarkResult[] = [];

export const benchmarkResults = {
  add(result: Omit<BenchmarkResult, "id">) {
    results = [...results, { ...result, id: nextId++ }].slice(-MAX_RESULTS);
    for (const listener of listeners) listener();
  },
  clear() {
    results = [];
    for (const listener of listeners) listener();
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBenchmarkResults() {
  return useSyncExternalStore(subscribe, () => results, () => EMPTY);
}

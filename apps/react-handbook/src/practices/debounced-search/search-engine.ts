// The practice's core, framework-free: debounce, minimum length, in-flight
// dedupe, cache with stale-while-revalidate, AbortController for superseded
// requests and a run-id guard so only the latest search changes the display.
// Each technique can be switched off to show the bug it prevents. React
// subscribes with useSyncExternalStore; every change emits a new snapshot.

import {
  normalizeQuery,
  type SearchResult,
} from "@/server/practices/debounced-search/search.schema";

import type { Fetcher } from "./search-api";
import type { SearchCache } from "./search-cache";

export type Techniques = {
  debounce: boolean;
  cache: boolean;
  abort: boolean;
  staleGuard: boolean;
};

export type EngineOptions = Techniques & {
  debounceMs: number;
  minLength: number;
};

export const ALL_ON: Techniques = { debounce: true, cache: true, abort: true, staleGuard: true };
export const ALL_OFF: Techniques = { debounce: false, cache: false, abort: false, staleGuard: false };

export const DEFAULT_OPTIONS: EngineOptions = { ...ALL_ON, debounceMs: 300, minLength: 2 };

export type Outcome =
  | "debounced"
  | "cache-hit"
  | "pending"
  | "shown"
  | "aborted"
  | "stale"
  | "error"
  | "error-dropped";

export type TimelineEntry = {
  id: number;
  kind: "debounced" | "cache" | "request";
  query: string;
  /** A background refresh of stale cached results. */
  revalidate: boolean;
  outcome: Outcome;
  startedAt: number;
  endedAt: number | null;
  resultCount?: number;
  message?: string;
};

export type Counters = {
  keystrokes: number;
  debounced: number;
  requests: number;
  cacheHits: number;
  aborted: number;
  stale: number;
  errors: number;
};

export type Shown = {
  key: string;
  result: SearchResult;
  source: "network" | "cache";
  /** When the cached entry was stored (Date.now), for source "cache". */
  cachedAt: number | null;
  /** Stale cached results are shown while a background refresh runs. */
  refreshing: boolean;
};

export type SearchSnapshot = {
  /** Raw text in the box. */
  input: string;
  /** Normalized input: the cache key and request parameter. */
  key: string;
  tooShort: boolean;
  waiting: { key: string; startedAt: number; delayMs: number } | null;
  /** A request for the latest search is in flight. */
  loading: boolean;
  /** Requests in flight, current or not. */
  inflight: number;
  shown: Shown | null;
  error: { key: string; message: string } | null;
  /** Key of the latest search: what should be shown. */
  runKey: string | null;
  /** Trimmed raw text of the latest search, for the URL. */
  runText: string;
  timeline: TimelineEntry[];
  counters: Counters;
  options: EngineOptions;
};

type Request = {
  entryId: number;
  key: string;
  runId: number;
  controller: AbortController;
  done: boolean;
};

const MAX_TIMELINE = 50;

const ZERO: Counters = {
  keystrokes: 0, debounced: 0, requests: 0, cacheHits: 0, aborted: 0, stale: 0, errors: 0,
};

/**
 * Settled, but the results on screen belong to another query than the box:
 * the bug a missing stale-response guard causes.
 */
export function isMismatch(s: SearchSnapshot) {
  return (
    !s.waiting && s.inflight === 0 && !s.tooShort && s.shown !== null && s.shown.key !== s.key
  );
}

export class SearchEngine {
  private state: SearchSnapshot;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private startTimer: ReturnType<typeof setTimeout> | null = null;
  private runId = 0;
  /** Last normalized key a keystroke was handled for. */
  private lastKey: string;
  private requests = new Map<number, Request>();
  private nextEntryId = 1;
  private readonly fetcher: Fetcher;
  private readonly cache: SearchCache;
  private readonly now: () => number;

  constructor({
    initialText = "",
    fetcher,
    cache,
    options = DEFAULT_OPTIONS,
    now = () => performance.now(),
  }: {
    initialText?: string;
    fetcher: Fetcher;
    cache: SearchCache;
    options?: EngineOptions;
    now?: () => number;
  }) {
    this.fetcher = fetcher;
    this.cache = cache;
    this.now = now;
    const key = normalizeQuery(initialText);
    this.lastKey = key;
    this.state = {
      input: initialText,
      key,
      tooShort: key.length < options.minLength,
      waiting: null,
      loading: false,
      inflight: 0,
      shown: null,
      error: null,
      runKey: null,
      runText: "",
      timeline: [],
      counters: ZERO,
      options,
    };
  }

  // --- subscription ----------------------------------------------------------

  getSnapshot = (): SearchSnapshot => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // --- lifecycle -------------------------------------------------------------

  /** Runs the initial query (from the URL) right away, without debounce. */
  start() {
    // Deferred a task so a Strict Mode mount → unmount → mount sends one request.
    this.startTimer = setTimeout(() => {
      this.startTimer = null;
      const { key, tooShort } = this.state;
      if (key && !tooShort && this.state.runKey === null) this.run(key);
    }, 0);
  }

  /** Clears timers and aborts everything in flight (unmount). */
  stop() {
    if (this.startTimer) clearTimeout(this.startTimer);
    this.startTimer = null;
    this.cancelWait(false);
    for (const req of this.requests.values()) this.abortRequest(req);
    this.sync();
  }

  // --- input -----------------------------------------------------------------

  setInput(text: string) {
    if (text === this.state.input) return;
    const key = normalizeQuery(text);
    const tooShort = key.length < this.state.options.minLength;
    this.patch({ input: text, key, tooShort, counters: this.count("keystrokes") });

    if (key === this.lastKey) return this.sync();
    this.lastKey = key;

    if (tooShort) {
      this.cancelWait(true);
      this.supersede();
      this.patch({ shown: null, error: null, runKey: null, runText: "" });
      return this.sync();
    }
    const { debounce, debounceMs, cache } = this.state.options;
    // A fresh cached answer costs nothing: show it without waiting.
    const freshHit = cache && this.cache.peek(key) === "fresh";
    if (debounce && debounceMs > 0 && !freshHit) return this.schedule(key, debounceMs);
    this.cancelWait(true);
    this.run(key);
  }

  /** Enter: search now, unless the latest search is already this query. */
  submit() {
    const { key, tooShort, runKey, error, loading, shown } = this.state;
    const hadWait = this.timer !== null;
    this.cancelWait(false);
    if (tooShort) return this.sync();
    const alreadyThere = runKey === key && !error && (loading || shown?.key === key);
    if (alreadyThere && !hadWait) return this.sync();
    this.run(key);
  }

  /** Searches the box's query again over the network, now. */
  retry() {
    if (this.state.tooShort) return;
    this.cancelWait(false);
    this.run(this.state.key, true);
  }

  setOptions(changes: Partial<EngineOptions>) {
    const options = { ...this.state.options, ...changes };
    this.patch({ options, tooShort: this.state.key.length < options.minLength });
    this.sync();
  }

  clearTimeline() {
    this.patch({ timeline: [], counters: ZERO });
    this.sync();
  }

  // --- internals -------------------------------------------------------------

  private schedule(key: string, delayMs: number) {
    this.cancelWait(true);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.patch({ waiting: null });
      this.run(key);
    }, delayMs);
    this.patch({ waiting: { key, startedAt: this.now(), delayMs } });
    this.sync();
  }

  /** Cancels a pending debounce; `record` logs it as debounced (a keystroke beat it). */
  private cancelWait(record: boolean) {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    const waiting = this.state.waiting;
    if (record && waiting) {
      this.addEntry({
        kind: "debounced", query: waiting.key, revalidate: false, outcome: "debounced",
        startedAt: waiting.startedAt, endedAt: this.now(),
      });
      this.patch({ counters: this.count("debounced") });
    }
    this.patch({ waiting: null });
  }

  /** Starts a new search generation; aborts older requests (except `keep`). */
  private supersede(keep?: Request) {
    this.runId += 1;
    if (this.state.options.abort) {
      for (const req of this.requests.values()) if (req !== keep) this.abortRequest(req);
    }
    return this.runId;
  }

  private run(key: string, force = false) {
    this.cancelWait(false);
    // Dedupe: a request for this key is already on its way.
    const existing = force
      ? undefined
      : [...this.requests.values()].find((req) => req.key === key);
    const runId = this.supersede(existing);
    this.patch({ runKey: key, runText: this.state.input.trim(), error: null });

    if (existing) {
      existing.runId = runId;
      return this.sync();
    }

    if (this.state.options.cache && !force) {
      const hit = this.cache.get(key);
      if (hit) {
        const { entry, state } = hit;
        this.patch({
          counters: this.count("cacheHits"),
          shown: {
            key, result: entry.result, source: "cache", cachedAt: entry.storedAt,
            refreshing: state === "stale",
          },
        });
        if (state === "fresh") {
          const at = this.now();
          this.addEntry({
            kind: "cache", query: key, revalidate: false, outcome: "cache-hit",
            startedAt: at, endedAt: at, resultCount: entry.result.total,
          });
          return this.sync();
        }
        return this.request(key, runId, true);
      }
    }
    this.request(key, runId, false);
  }

  private request(key: string, runId: number, revalidate: boolean) {
    const controller = new AbortController();
    const entryId = this.addEntry({
      kind: "request", query: key, revalidate, outcome: "pending",
      startedAt: this.now(), endedAt: null,
    });
    const req: Request = { entryId, key, runId, controller, done: false };
    this.requests.set(entryId, req);
    this.patch({ counters: this.count("requests") });
    this.sync();
    this.fetcher(key, controller.signal).then(
      (result) => this.settle(req, result, null),
      (error: unknown) => this.settle(req, null, error),
    );
  }

  private settle(req: Request, result: SearchResult | null, error: unknown) {
    // Aborted requests were closed when they were aborted.
    if (req.done) return;
    req.done = true;
    this.requests.delete(req.entryId);
    const endedAt = this.now();
    const { cache, staleGuard } = this.state.options;
    const apply = req.runId === this.runId || !staleGuard;

    if (result) {
      // Correct data for its own key, even if it's no longer wanted on screen.
      if (cache) this.cache.set(req.key, result);
      if (apply) {
        this.patchEntry(req.entryId, { outcome: "shown", endedAt, resultCount: result.total });
        this.patch({
          shown: { key: req.key, result, source: "network", cachedAt: null, refreshing: false },
          error: null,
        });
      } else {
        this.patchEntry(req.entryId, { outcome: "stale", endedAt, resultCount: result.total });
        this.patch({ counters: this.count("stale") });
      }
    } else {
      const message = error instanceof Error ? error.message : String(error);
      this.patch({ counters: this.count("errors") });
      if (apply) {
        this.patchEntry(req.entryId, { outcome: "error", endedAt, message });
        const shown = this.state.shown;
        this.patch({
          error: { key: req.key, message },
          // A failed refresh keeps the stale results the user already had.
          shown: shown && shown.key === req.key ? { ...shown, refreshing: false } : null,
        });
      } else {
        this.patchEntry(req.entryId, { outcome: "error-dropped", endedAt, message });
      }
    }
    this.sync();
  }

  private abortRequest(req: Request) {
    req.done = true;
    req.controller.abort();
    this.requests.delete(req.entryId);
    this.patchEntry(req.entryId, { outcome: "aborted", endedAt: this.now() });
    this.patch({ counters: this.count("aborted") });
  }

  private addEntry(entry: Omit<TimelineEntry, "id">) {
    const id = this.nextEntryId++;
    this.patch({ timeline: [{ id, ...entry }, ...this.state.timeline].slice(0, MAX_TIMELINE) });
    return id;
  }

  private patchEntry(id: number, changes: Partial<TimelineEntry>) {
    this.patch({
      timeline: this.state.timeline.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    });
  }

  private count(name: keyof Counters): Counters {
    const counters = this.state.counters;
    return { ...counters, [name]: counters[name] + 1 };
  }

  private patch(changes: Partial<SearchSnapshot>) {
    this.state = { ...this.state, ...changes };
  }

  /** Recomputes request flags and notifies subscribers once. */
  private sync() {
    let loading = false;
    for (const req of this.requests.values()) if (req.runId === this.runId) loading = true;
    this.patch({ loading, inflight: this.requests.size });
    for (const listener of this.listeners) listener();
  }
}

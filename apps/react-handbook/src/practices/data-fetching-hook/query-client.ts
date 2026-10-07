// A small, hand-built query cache: keyed entries, observers, stale-while-
// revalidate, dedupe, cancellation, retry with backoff, offline pause,
// focus/online refresh, garbage collection and prefetch.

import { hashKey } from "./hash-key";

export type QueryKey = readonly unknown[];
export type Fetcher<T> = (context: { signal: AbortSignal }) => Promise<T>;

export type QueryState<T = unknown> = {
  /** Whether data or a final error exists. */
  status: "loading" | "success" | "error";
  /** Request activity, independent of status. */
  fetchStatus: "idle" | "fetching" | "paused";
  data: T | undefined;
  error: Error | null;
  /** 0 = never loaded. */
  dataUpdatedAt: number;
  /** Current attempt while fetching, 0 when idle. */
  attempt: number;
  invalidated: boolean;
};

export type QueryDefaults = {
  /** ms, or Infinity for "never stale". */
  staleTime: number;
  gcTime: number;
  retry: number;
  refetchOnFocus: boolean;
};

export type InspectedEntry = {
  hash: string;
  key: QueryKey;
  state: QueryState;
  observers: number;
  requests: number;
  stale: boolean;
  gcAt: number | null;
};

/** An error with an HTTP status; 4xx errors are not retried. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Entry = {
  key: QueryKey;
  hash: string;
  state: QueryState;
  fetcher: Fetcher<unknown> | null;
  observers: number;
  listeners: Set<() => void>;
  token: number;
  abort: AbortController | null;
  promise: Promise<void> | null;
  prefetching: boolean;
  gcTimer: ReturnType<typeof setTimeout> | null;
  gcAt: number | null;
  requests: number;
  lastFocusRefetch: number;
};

const INITIAL_STATE: QueryState = {
  status: "loading",
  fetchStatus: "idle",
  data: undefined,
  error: null,
  dataUpdatedAt: 0,
  attempt: 0,
  invalidated: false,
};

const FOCUS_THROTTLE_MS = 5000;
const MAX_RETRY_DELAY_MS = 30_000;

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function shouldRetry(error: Error) {
  return !(error instanceof HttpError && error.status >= 400 && error.status < 500);
}

/** 1 s, 2 s, 4 s … ±25 %, capped. */
function backoff(attempt: number) {
  const base = Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
  return base * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function waitForOnline(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      resolve();
    };
    window.addEventListener("online", done);
    signal.addEventListener("abort", done);
  });
}

export class QueryClient {
  private entries = new Map<string, Entry>();
  private anyListeners = new Set<() => void>();
  private defaults: QueryDefaults = {
    staleTime: 0,
    gcTime: 5 * 60_000,
    retry: 3,
    refetchOnFocus: true,
  };
  private windowListeners = false;
  private version = 0;
  private inspected: { version: number; entries: InspectedEntry[] } = {
    version: -1,
    entries: [],
  };

  // --- defaults ------------------------------------------------------------

  getDefaults(): QueryDefaults {
    return this.defaults;
  }

  setDefaults(changes: Partial<QueryDefaults>) {
    this.defaults = { ...this.defaults, ...changes };
    this.emitAny();
  }

  // --- internals -----------------------------------------------------------

  private ensure(key: QueryKey, hash = hashKey(key)): Entry {
    let entry = this.entries.get(hash);
    if (!entry) {
      entry = {
        key,
        hash,
        state: INITIAL_STATE,
        fetcher: null,
        observers: 0,
        listeners: new Set(),
        token: 0,
        abort: null,
        promise: null,
        prefetching: false,
        gcTimer: null,
        gcAt: null,
        requests: 0,
        lastFocusRefetch: 0,
      };
      this.entries.set(hash, entry);
    }
    return entry;
  }

  private setState(entry: Entry, changes: Partial<QueryState>) {
    entry.state = { ...entry.state, ...changes };
    for (const listener of entry.listeners) listener();
    this.emitAny();
  }

  private emitAny() {
    this.version++;
    for (const listener of this.anyListeners) listener();
  }

  private isStale(entry: Entry) {
    const { invalidated, dataUpdatedAt } = entry.state;
    if (invalidated || dataUpdatedAt === 0) return true;
    const { staleTime } = this.defaults;
    return staleTime !== Infinity && Date.now() - dataUpdatedAt >= staleTime;
  }

  private cancel(entry: Entry) {
    if (!entry.promise) return;
    entry.token++;
    entry.abort?.abort();
    entry.abort = null;
    entry.promise = null;
    entry.prefetching = false;
    this.setState(entry, { fetchStatus: "idle", attempt: 0 });
  }

  private clearGc(entry: Entry) {
    if (entry.gcTimer) clearTimeout(entry.gcTimer);
    entry.gcTimer = null;
    entry.gcAt = null;
  }

  private scheduleGc(entry: Entry) {
    if (entry.observers > 0 || entry.promise) return;
    this.clearGc(entry);
    const { gcTime } = this.defaults;
    entry.gcAt = Date.now() + gcTime;
    entry.gcTimer = setTimeout(() => {
      if (entry.observers === 0 && !entry.promise && this.entries.get(entry.hash) === entry) {
        this.entries.delete(entry.hash);
        this.emitAny();
      }
    }, gcTime);
    this.emitAny();
  }

  private fetch(entry: Entry, { cancelRefetch = false, prefetch = false } = {}) {
    if (entry.promise && !cancelRefetch) return entry.promise;
    if (entry.promise) this.cancel(entry);
    const fetcher = entry.fetcher;
    if (!fetcher) return Promise.resolve();

    const token = ++entry.token;
    const controller = new AbortController();
    entry.abort = controller;
    entry.prefetching = prefetch;
    const current = () => token === entry.token && !controller.signal.aborted;

    const run = async () => {
      for (let attempt = 1; ; attempt++) {
        if (!current()) return;
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          this.setState(entry, { fetchStatus: "paused", attempt });
          await waitForOnline(controller.signal);
          if (!current()) return;
        }
        this.setState(entry, { fetchStatus: "fetching", attempt });
        entry.requests++;
        try {
          // Wrapping in a promise also catches fetchers that throw synchronously.
          const data = await Promise.resolve().then(() => fetcher({ signal: controller.signal }));
          if (!current()) return;
          this.setState(entry, {
            status: "success",
            data,
            error: null,
            dataUpdatedAt: Date.now(),
            fetchStatus: "idle",
            attempt: 0,
            invalidated: false,
          });
          return;
        } catch (raw) {
          if (!current()) return;
          const error = toError(raw);
          if (attempt <= this.defaults.retry && shouldRetry(error)) {
            await sleep(backoff(attempt), controller.signal);
            continue;
          }
          // Keep previous data: a failed refresh still shows what we had.
          this.setState(entry, { status: "error", error, fetchStatus: "idle", attempt: 0 });
          return;
        }
      }
    };

    const promise = run().finally(() => {
      if (entry.token !== token) return;
      entry.promise = null;
      entry.abort = null;
      entry.prefetching = false;
      this.scheduleGc(entry);
    });
    entry.promise = promise;
    return promise;
  }

  private attachWindowListeners() {
    if (this.windowListeners || typeof window === "undefined") return;
    this.windowListeners = true;
    const refreshStale = () => {
      if (!this.defaults.refetchOnFocus) return;
      const now = Date.now();
      for (const entry of this.entries.values()) {
        if (entry.observers === 0 || entry.promise || !this.isStale(entry)) continue;
        if (now - entry.lastFocusRefetch < FOCUS_THROTTLE_MS) continue;
        entry.lastFocusRefetch = now;
        void this.fetch(entry);
      }
    };
    window.addEventListener("focus", refreshStale);
    window.addEventListener("online", refreshStale);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") refreshStale();
    });
  }

  // --- observers (used by useQuery) -----------------------------------------

  getState(hash: string): QueryState {
    return this.entries.get(hash)?.state ?? INITIAL_STATE;
  }

  subscribe(
    hash: string,
    key: QueryKey,
    getFetcher: () => Fetcher<unknown>,
    listener: () => void,
  ) {
    this.attachWindowListeners();
    const entry = this.ensure(key, hash);
    entry.fetcher = getFetcher();
    entry.listeners.add(listener);
    entry.observers++;
    this.clearGc(entry);
    this.emitAny();
    if (this.isStale(entry)) void this.fetch(entry);

    return () => {
      entry.listeners.delete(listener);
      entry.observers--;
      this.emitAny();
      // Wait a tick: a quick remount (StrictMode, key flip-flop) shouldn't cancel.
      setTimeout(() => {
        if (entry.observers > 0) return;
        if (!entry.prefetching) this.cancel(entry);
        this.scheduleGc(entry);
      }, 0);
    };
  }

  // --- public API ------------------------------------------------------------

  prefetchQuery<T>(key: QueryKey, fetcher: Fetcher<T>) {
    const entry = this.ensure(key);
    entry.fetcher ??= fetcher as Fetcher<unknown>;
    if (entry.promise || !this.isStale(entry)) return;
    void this.fetch(entry, { prefetch: true });
  }

  getQueryData<T>(key: QueryKey): T | undefined {
    return this.entries.get(hashKey(key))?.state.data as T | undefined;
  }

  /** Writes data directly (optimistic updates). Skipped when the updater returns undefined. */
  setQueryData<T>(key: QueryKey, updater: (previous: T | undefined) => T | undefined) {
    const entry = this.entries.get(hashKey(key));
    if (!entry) return;
    const data = updater(entry.state.data as T | undefined);
    if (data === undefined) return;
    this.setState(entry, { status: "success", data, error: null, dataUpdatedAt: Date.now() });
  }

  cancelQueries(predicate: (key: QueryKey) => boolean) {
    for (const entry of this.entries.values()) if (predicate(entry.key)) this.cancel(entry);
  }

  /** Marks matching entries stale and refreshes the ones in use. */
  invalidateQueries(predicate: (key: QueryKey) => boolean = () => true) {
    for (const entry of this.entries.values()) {
      if (!predicate(entry.key)) continue;
      this.setState(entry, { invalidated: true });
      if (entry.observers > 0) void this.fetch(entry, { cancelRefetch: true });
    }
  }

  /** Starts a fresh fetch (and a fresh series of retries). */
  refetch(hash: string) {
    const entry = this.entries.get(hash);
    if (entry) void this.fetch(entry, { cancelRefetch: true });
  }

  /** Drops everything; entries still in use start over with a fresh load. */
  clear() {
    for (const entry of [...this.entries.values()]) {
      this.cancel(entry);
      this.clearGc(entry);
      if (entry.observers === 0) {
        this.entries.delete(entry.hash);
      } else {
        entry.requests = 0;
        this.setState(entry, INITIAL_STATE);
        void this.fetch(entry);
      }
    }
    this.emitAny();
  }

  // --- inspector feed --------------------------------------------------------

  subscribeAll(listener: () => void) {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }

  /** Cached until the cache changes, so it's safe for useSyncExternalStore. */
  inspect(): InspectedEntry[] {
    if (this.inspected.version !== this.version) {
      this.inspected = {
        version: this.version,
        entries: [...this.entries.values()]
          .map((entry) => ({
            hash: entry.hash,
            key: entry.key,
            state: entry.state,
            observers: entry.observers,
            requests: entry.requests,
            stale: this.isStale(entry),
            gcAt: entry.gcAt,
          }))
          .sort((a, b) => a.hash.localeCompare(b.hash)),
      };
    }
    return this.inspected.entries;
  }
}

/** The playground-wide cache. Only mutated from effects and event handlers. */
export const queryClient = new QueryClient();

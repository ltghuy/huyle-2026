import type { RunStats } from "@/server/practices/lazy-images/photos.schema";

import type { LoaderEvent } from "./lazy-loader";
import { fetchRunStats, statsStreamUrl } from "./photos-api";

// Live numbers for one run. Client-side counts come from the loader's
// events; requests, bytes and cancellations come from the server (a
// server-sent event stream), because the page can't see native or eager
// fetches, nor cancelled ones.

export type MetricsSnapshot = {
  total: number;
  shown: number;
  /** Tiles currently in the failed state. */
  failed: number;
  skipped: number;
  /** Tiles visible when the run started. */
  visibleCount: number;
  /** ms until all of them were shown; null while waiting or if one failed. */
  visibleReadyMs: number | null;
  visibleFailed: boolean;
  /** Sum of layout-shift scores inside the gallery; null if unsupported. */
  layoutShift: number | null;
  server: RunStats | null;
  serverStale: boolean;
  /** Title of the most recent failure, for the live region. */
  lastFailure: string | null;
};

const CONNECT_TIMEOUT_MS = 1500;

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  sources?: { node: Node | null }[];
};

export const layoutShiftSupported = () =>
  typeof PerformanceObserver !== "undefined" &&
  PerformanceObserver.supportedEntryTypes?.includes("layout-shift");

export class RunMetrics {
  private snapshot: MetricsSnapshot;
  private listeners = new Set<() => void>();
  private shownKeys = new Set<string>();
  private failedKeys = new Set<string>();
  private visibleKeys = new Set<string>();
  private startedAt = 0;
  private shiftObserver: PerformanceObserver | null = null;
  private source: EventSource | null = null;
  private stopped = false;
  /** The gallery mounted at least once (a run that never showed isn't a result). */
  started = false;

  constructor(
    readonly run: string,
    readonly total: number,
    private titles: Map<string, string>,
  ) {
    this.snapshot = {
      total, shown: 0, failed: 0, skipped: 0, visibleCount: 0, visibleReadyMs: null, visibleFailed: false,
      layoutShift: null, server: null, serverStale: false, lastFailure: null,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  /** Called by the gallery after its first layout. Re-callable (Strict Mode). */
  start(root: HTMLElement, visible: string[]) {
    if (this.stopped) return;
    this.started = true;
    this.startedAt = performance.now();
    this.visibleKeys = new Set(visible.filter((key) => !this.shownKeys.has(key)));
    this.update({
      visibleCount: visible.length,
      visibleReadyMs: this.visibleKeys.size === 0 ? 0 : null,
      layoutShift: layoutShiftSupported() ? (this.snapshot.layoutShift ?? 0) : null,
    });
    this.observeShifts(root);
  }

  /**
   * Opens the stats stream; resolves once it is connected (or failed), so the
   * gallery can wait for it before its images take the other connections.
   */
  connect(): Promise<void> {
    if (this.source || this.stopped) return Promise.resolve();
    const source = new EventSource(statsStreamUrl(this.run));
    this.source = source;
    source.onmessage = (event) => {
      if (this.stopped) return;
      this.update({ server: JSON.parse(event.data) as RunStats, serverStale: false });
    };
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, CONNECT_TIMEOUT_MS);
      source.onopen = () => {
        clearTimeout(timer);
        if (this.snapshot.serverStale) this.update({ serverStale: false });
        resolve();
      };
      source.onerror = () => {
        clearTimeout(timer);
        // EventSource reconnects by itself; show the last numbers as stale meanwhile.
        if (!this.stopped) this.update({ serverStale: true });
        resolve();
      };
    });
  }

  /** Gallery unmounted or remounting: stop observing shifts, keep numbers. */
  pause() {
    this.shiftObserver?.disconnect();
    this.shiftObserver = null;
  }

  /** Run ended: close the stream, fetch final server numbers once, stop for good. */
  async finish(): Promise<MetricsSnapshot> {
    this.pause();
    this.stopped = true;
    this.source?.close();
    this.source = null;
    // Let the server record cancellations caused by ending the run.
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const server = await fetchRunStats(this.run);
      this.snapshot = { ...this.snapshot, server, serverStale: false };
    } catch {
      this.snapshot = { ...this.snapshot, serverStale: true };
    }
    return this.snapshot;
  }

  handle = (event: LoaderEvent, key: string) => {
    if (this.stopped) return;
    switch (event) {
      case "shown": {
        this.shownKeys.add(key);
        this.failedKeys.delete(key);
        let visibleReadyMs = this.snapshot.visibleReadyMs;
        if (this.visibleKeys.delete(key) && this.visibleKeys.size === 0 && !this.snapshot.visibleFailed) {
          visibleReadyMs = Math.round(performance.now() - this.startedAt);
        }
        this.update({ shown: this.shownKeys.size, failed: this.failedKeys.size, visibleReadyMs });
        break;
      }
      case "failed":
        this.failedKeys.add(key);
        this.update({
          failed: this.failedKeys.size,
          visibleFailed: this.snapshot.visibleFailed || this.visibleKeys.has(key),
          lastFailure: this.titles.get(key) ?? key,
        });
        break;
      case "retried":
        this.failedKeys.delete(key);
        this.update({ failed: this.failedKeys.size });
        break;
      case "skipped":
        this.update({ skipped: this.snapshot.skipped + 1 });
        break;
      case "requested":
      case "cancelled":
        // Counted by the server.
        break;
      default: {
        const unhandled: never = event;
        throw new Error(`Unhandled loader event ${String(unhandled)}`);
      }
    }
  };

  private observeShifts(root: HTMLElement) {
    this.shiftObserver?.disconnect();
    if (!layoutShiftSupported()) return;
    this.shiftObserver = new PerformanceObserver((list) => {
      let added = 0;
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        // Includes shifts flagged as following input: the click that starts
        // a run would otherwise hide the first image loads at low latency.
        if (entry.sources?.some((source) => source.node && root.contains(source.node))) {
          added += entry.value;
        }
      }
      if (added > 0) this.update({ layoutShift: (this.snapshot.layoutShift ?? 0) + added });
    });
    this.shiftObserver.observe({ type: "layout-shift" });
  }

  private update(patch: Partial<MetricsSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
}

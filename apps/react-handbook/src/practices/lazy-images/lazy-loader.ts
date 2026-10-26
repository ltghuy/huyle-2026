import { bytesOf, widthOf } from "./photos-api";

// Framework-free tile loader. One instance per run.
//
// observe mode (hand-built strategy): one IntersectionObserver whose root is
// the gallery scroller, grown by `rootMarginPx`. A tile entering that band
// while scrolling waits until scrolling has paused for `delayMs` (skipped if
// it leaves the band first; tiles in range on arrival start at once), then
// an off-DOM Image picks a
// srcset candidate for the tile's measured width, loads and decodes it; only
// then is the tile told to show `currentSrc` (same URL, so no second request).
// A tile leaving the band mid-download is cancelled. Priority tiles start
// immediately at high fetch priority and are never cancelled.
//
// manual mode (native / eager): the browser loads the <img>; tiles report
// load/error so every strategy shares the same state, counters and retry.

export type TileStatus = "idle" | "waiting" | "loading" | "shown" | "error";

export type TileState = {
  status: TileStatus;
  /** Candidate URL once shown. */
  src: string | null;
  /** Candidate width once shown. */
  width: number | null;
  /** Body size once shown, when resource timing has it. */
  bytes: number | null;
  attempt: number;
};

export type LoaderEvent = "requested" | "shown" | "failed" | "retried" | "skipped" | "cancelled";

export type LoaderOptions = {
  observe: boolean;
  rootMarginPx: number;
  delayMs: number;
  srcSet: (key: string, attempt: number) => string;
  onEvent: (event: LoaderEvent, key: string) => void;
};

type Entry = {
  key: string;
  el: HTMLElement;
  priority: boolean;
  state: TileState;
  img: HTMLImageElement | null;
  /** The download finished (decode may still be running): don't cancel. */
  loaded: boolean;
  removing: boolean;
  /** Got its first observer record (the initial position, not a scroll). */
  seen: boolean;
};

const IDLE: TileState = { status: "idle", src: null, width: null, bytes: null, attempt: 0 };

export class LazyLoader {
  readonly fallback: boolean;
  private entries = new Map<string, Entry>();
  /** Separate from entries: a tile may subscribe before it registers. */
  private listeners = new Map<string, Set<() => void>>();
  private byEl = new WeakMap<Element, Entry>();
  private observer: IntersectionObserver | null = null;
  private root: HTMLElement | null = null;
  /** One timer for all waiting tiles: fires once scrolling pauses for delayMs. */
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private attached = false;
  private destroyed = false;

  constructor(private options: LoaderOptions) {
    this.fallback = options.observe && typeof IntersectionObserver === "undefined";
  }

  getState(key: string): TileState {
    return this.entries.get(key)?.state ?? IDLE;
  }

  subscribe(key: string, listener: () => void): () => void {
    let set = this.listeners.get(key);
    if (!set) this.listeners.set(key, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }

  /** Tiles register in their layout effect, before the gallery attaches. */
  register(key: string, el: HTMLElement, priority: boolean): () => void {
    let entry = this.entries.get(key);
    if (entry) {
      // Re-registered right after a cleanup (Strict Mode): keep its state.
      entry.removing = false;
      if (entry.el !== el) {
        this.observer?.unobserve(entry.el);
        entry.el = el;
      }
      entry.priority = priority;
    } else {
      entry = {
        key, el, priority, state: IDLE, img: null, loaded: false, removing: false, seen: false,
      };
      this.entries.set(key, entry);
    }
    this.byEl.set(el, entry);
    if (this.attached) this.track(entry);

    const registered = entry;
    return () => {
      registered.removing = true;
      // Defer, so a cleanup immediately followed by setup doesn't cancel.
      queueMicrotask(() => {
        if (!registered.removing || this.entries.get(key) !== registered) return;
        this.observer?.unobserve(registered.el);
        this.stop(registered);
        this.entries.delete(key);
      });
    };
  }

  /** Starts observing inside `root`. Safe to call again after `detach()`. */
  attach(root: HTMLElement) {
    if (this.destroyed || this.attached) return;
    this.attached = true;
    if (this.options.observe && !this.fallback) {
      this.observer = new IntersectionObserver((records) => this.handleIntersections(records), {
        root,
        rootMargin: `${this.options.rootMarginPx}px 0px`,
        threshold: 0,
      });
      this.root = root;
      root.addEventListener("scroll", this.handleScroll, { passive: true });
    }
    for (const entry of this.entries.values()) this.track(entry);
  }

  /** Stops observing; in-flight downloads continue. */
  detach() {
    this.attached = false;
    this.observer?.disconnect();
    this.observer = null;
    this.root?.removeEventListener("scroll", this.handleScroll);
    this.root = null;
    this.clearSettle();
    for (const entry of this.entries.values()) {
      if (entry.state.status === "waiting") this.set(entry, { ...entry.state, status: "idle" });
    }
  }

  /** Ends the run: cancels everything, silently. */
  destroy() {
    this.detach();
    this.destroyed = true;
    for (const entry of this.entries.values()) this.stop(entry);
    this.entries.clear();
  }

  retry(key: string) {
    const entry = this.entries.get(key);
    if (!entry || entry.state.status !== "error" || this.destroyed) return;
    this.options.onEvent("retried", key);
    const attempt = entry.state.attempt + 1;
    if (!this.options.observe) {
      // New srcset on the <img>: the browser fetches it again.
      this.set(entry, { ...IDLE, attempt });
      return;
    }
    this.set(entry, { ...IDLE, attempt });
    this.start(entry);
  }

  /** Retries every failed tile; returns how many. */
  retryFailed(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.state.status === "error") {
        this.retry(entry.key);
        count++;
      }
    }
    return count;
  }

  // manual mode: the tile's own <img> loaded or failed.

  reportLoad(key: string, img: HTMLImageElement) {
    const entry = this.entries.get(key);
    if (!entry || this.destroyed) return;
    const attempt = entry.state.attempt;
    img.decode().then(
      () => {
        if (entry.state.attempt === attempt && !this.destroyed) this.show(entry, img.currentSrc);
      },
      () => {
        if (entry.state.attempt === attempt && !this.destroyed) this.fail(entry);
      },
    );
  }

  reportError(key: string) {
    const entry = this.entries.get(key);
    if (entry && !this.destroyed && entry.state.status !== "error") this.fail(entry);
  }

  // observe mode internals

  private track(entry: Entry) {
    if (!this.options.observe) return;
    if (this.fallback) {
      if (entry.state.status === "idle") this.start(entry);
      return;
    }
    if (entry.priority) {
      if (entry.state.status === "idle") this.start(entry);
      return;
    }
    this.observer?.observe(entry.el);
  }

  private handleIntersections(records: IntersectionObserverEntry[]) {
    for (const record of records) {
      const entry = this.byEl.get(record.target);
      if (!entry || entry.priority) continue;
      const { status } = entry.state;
      // The start delay filters scrolling; tiles in range on arrival start now.
      const initial = !entry.seen;
      entry.seen = true;
      if (record.isIntersecting) {
        if (status !== "idle") continue;
        if (this.options.delayMs > 0 && !initial) {
          this.set(entry, { ...entry.state, status: "waiting" });
          this.armSettle();
        } else {
          this.start(entry);
        }
      } else if (status === "waiting") {
        this.set(entry, { ...entry.state, status: "idle" });
        this.options.onEvent("skipped", entry.key);
      } else if (status === "loading" && !entry.loaded) {
        this.stop(entry);
        this.set(entry, { ...entry.state, status: "idle" });
        this.options.onEvent("cancelled", entry.key);
      }
    }
  }

  private start(entry: Entry) {
    if (this.destroyed) return;
    const width = Math.max(1, Math.round(entry.el.getBoundingClientRect().width));
    const img = new Image();
    img.decoding = "async";
    if (entry.priority) img.fetchPriority = "high";
    // sizes before srcset: the exact slot width the browser should fill.
    img.sizes = `${width}px`;
    img.onload = () => {
      entry.loaded = true;
      img.decode().then(
        () => entry.img === img && this.show(entry, img.currentSrc),
        () => entry.img === img && this.fail(entry),
      );
    };
    img.onerror = () => entry.img === img && this.fail(entry);
    entry.img = img;
    entry.loaded = false;
    this.set(entry, { ...entry.state, status: "loading" });
    this.options.onEvent("requested", entry.key);
    img.srcset = this.options.srcSet(entry.key, entry.state.attempt);
  }

  /** Cancels a pending download without events. */
  private stop(entry: Entry) {
    if (!this.options.observe) {
      // The tile's own <img>: browsers keep loading removed images, which
      // would hold connections the next run needs.
      for (const img of entry.el.querySelectorAll<HTMLImageElement>("img[srcset]")) {
        if (!img.complete) img.srcset = "";
      }
      return;
    }
    const img = entry.img;
    if (!img) return;
    entry.img = null;
    img.onload = null;
    img.onerror = null;
    if (!entry.loaded) {
      // Dropping the only candidate aborts the request.
      img.srcset = "";
      img.removeAttribute("src");
    }
  }

  private show(entry: Entry, src: string) {
    entry.img = null;
    this.set(entry, { ...entry.state, status: "shown", src, width: widthOf(src), bytes: bytesOf(src) });
    this.options.onEvent("shown", entry.key);
  }

  private fail(entry: Entry) {
    entry.img = null;
    this.set(entry, { ...entry.state, status: "error", src: null });
    this.options.onEvent("failed", entry.key);
  }

  private handleScroll = () => {
    // Still scrolling: push back the start of every waiting tile.
    if (this.settleTimer) this.armSettle();
  };

  private armSettle() {
    this.clearSettle();
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      for (const entry of this.entries.values()) {
        if (entry.state.status === "waiting") this.start(entry);
      }
    }, this.options.delayMs);
  }

  private clearSettle() {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = null;
  }

  private set(entry: Entry, state: TileState) {
    entry.state = state;
    const set = this.listeners.get(entry.key);
    if (set) for (const listener of set) listener();
  }
}

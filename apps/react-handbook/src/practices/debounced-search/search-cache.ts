// A small search-result cache: entries are fresh for `freshMs`, usable but
// stale (stale-while-revalidate) until `maxAgeMs`, and at most `maxEntries`
// are kept, evicting the least recently used. A Map iterates in insertion
// order, so "delete + set" on every read keeps the newest entry last.

import type { SearchResult } from "@/server/practices/debounced-search/search.schema";

export type CacheSettings = {
  freshMs: number;
  maxAgeMs: number;
  maxEntries: number;
};

export type CacheEntry = {
  key: string;
  result: SearchResult;
  storedAt: number;
  hits: number;
};

export type CacheLookup = { entry: CacheEntry; state: "fresh" | "stale" };

export const DEFAULT_CACHE_SETTINGS: CacheSettings = {
  freshMs: 30_000,
  maxAgeMs: 5 * 60_000,
  maxEntries: 20,
};

export class SearchCache {
  private map = new Map<string, CacheEntry>();
  private listeners = new Set<() => void>();
  private snapshot: CacheEntry[] = [];
  private settings: CacheSettings;
  private readonly now: () => number;

  constructor(settings: Partial<CacheSettings> = {}, now: () => number = Date.now) {
    this.settings = { ...DEFAULT_CACHE_SETTINGS, ...settings };
    this.now = now;
  }

  getSettings(): CacheSettings {
    return this.settings;
  }

  configure(changes: Partial<CacheSettings>) {
    this.settings = { ...this.settings, ...changes };
    this.evict();
    this.emit();
  }

  /** Freshness of a key without counting a hit or touching recency. */
  peek(key: string): "fresh" | "stale" | "expired" | null {
    const entry = this.map.get(key);
    return entry ? this.stateOf(entry) : null;
  }

  /** Looks up a key and marks it as most recently used. */
  get(key: string): CacheLookup | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    const state = this.stateOf(entry);
    if (state === "expired") {
      this.map.delete(key);
      this.emit();
      return null;
    }
    const touched = { ...entry, hits: entry.hits + 1 };
    this.map.delete(key);
    this.map.set(key, touched);
    this.emit();
    return { entry: touched, state };
  }

  set(key: string, result: SearchResult) {
    const previous = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, { key, result, storedAt: this.now(), hits: previous?.hits ?? 0 });
    this.evict();
    this.emit();
  }

  clear() {
    this.map.clear();
    this.emit();
  }

  stateOf(entry: CacheEntry): "fresh" | "stale" | "expired" {
    const age = this.now() - entry.storedAt;
    if (age < this.settings.freshMs) return "fresh";
    if (age < this.settings.maxAgeMs) return "stale";
    return "expired";
  }

  /** Most recently used first. Stable between changes (useSyncExternalStore). */
  entries = (): CacheEntry[] => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private evict() {
    for (const key of this.map.keys()) {
      if (this.map.size <= this.settings.maxEntries) break;
      this.map.delete(key);
    }
  }

  private emit() {
    this.snapshot = [...this.map.values()].reverse();
    for (const listener of this.listeners) listener();
  }
}

const EMPTY: CacheEntry[] = [];
export const getServerEntries = () => EMPTY;

/** The practice's cache: module level, so it survives navigating away. */
export const searchCache = new SearchCache();

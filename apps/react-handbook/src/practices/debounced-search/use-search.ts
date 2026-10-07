import { useEffect, useState, useSyncExternalStore } from "react";

import { fetchSearch } from "./search-api";
import { getServerEntries, searchCache } from "./search-cache";
import { SearchEngine } from "./search-engine";

/** One engine per mounted demo; the cache is shared and outlives it. */
export function useSearchEngine(initialText: string) {
  const [engine] = useState(
    () => new SearchEngine({ initialText, fetcher: fetchSearch, cache: searchCache }),
  );
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);

  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  useUrlQuery(snapshot.runText, snapshot.tooShort);
  return { engine, snapshot };
}

/**
 * Mirrors the latest search into `?q=` with replaceState: no history entry
 * per query, and Next's router stays in sync (native History API support).
 */
function useUrlQuery(runText: string, tooShort: boolean) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("q");
    if (tooShort) {
      if (current === null) return;
      url.searchParams.delete("q");
    } else {
      if (!runText || current === runText) return;
      url.searchParams.set("q", runText);
    }
    window.history.replaceState(null, "", url);
  }, [runText, tooShort]);
}

export function useCacheEntries() {
  return useSyncExternalStore(searchCache.subscribe, searchCache.entries, getServerEntries);
}

/** A clock value that ticks every `intervalMs` while `active`. */
export function useNow(clock: () => number, active: boolean, intervalMs: number) {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(clock()), intervalMs);
    return () => clearInterval(id);
  }, [clock, active, intervalMs]);
  return now;
}

export const perfNow = () => performance.now();
export const wallNow = () => Date.now();

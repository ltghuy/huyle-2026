"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribeChanges } from "@/storage/broadcast";
import type { StoreName } from "@/storage/db";

export type QueryState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

/**
 * Reads from browser storage and re-reads whenever one of `stores` changes in
 * this tab or another one. `query` should be stable (module-level or memoised).
 */
export function useStorageQuery<T>(query: () => Promise<T>, stores: readonly StoreName[]): QueryState<T> & { reload: () => void } {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);
  const storesKey = stores.join(",");

  useEffect(() => {
    const watched = new Set(storesKey.split(","));
    return subscribeChanges((message) => {
      if (message.stores.some((store) => watched.has(store))) reload();
    });
  }, [storesKey, reload]);

  useEffect(() => {
    let active = true;
    query().then(
      (data) => active && setState({ status: "ready", data }),
      (error: unknown) => active && setState({ status: "error", error }),
    );
    return () => {
      active = false;
    };
  }, [query, tick]);

  return { ...state, reload };
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider, type Query, type QueryClient } from "@tanstack/react-query";
import { refreshIfChanged } from "@/content/client";
import { CONTENT_KEY, makeQueryClient, STORAGE_KEY } from "@/lib/query-client";
import { subscribeChanges, subscribeLocalChanges, TAB_ID } from "@/storage/broadcast";
import type { StoreName } from "@/storage/db";

/** Whether a cached content result is an earlier download served while offline. */
function servedStale(data: unknown): boolean {
  return typeof data === "object" && data !== null && "stale" in data && data.stale === true;
}

function readsChangedStore(query: Query, changed: readonly StoreName[]): boolean {
  const stores = query.meta?.stores;
  return query.queryKey[0] === STORAGE_KEY[0] && Array.isArray(stores) && changed.some((store) => stores.includes(store));
}

/** Re-reads every storage query that reads one of `changed`, cancelling reads already under way. */
function refreshStores(client: QueryClient, changed: readonly StoreName[]) {
  void client.invalidateQueries({ predicate: (query) => readsChangedStore(query, changed) });
}

/**
 * Reloads content on window focus when a new version was published, or when
 * what is cached came from an earlier download (offline). Returns the cleanup.
 */
function watchContent(client: QueryClient): () => void {
  async function handleFocus() {
    const changed = await refreshIfChanged();
    const stale = client.getQueriesData({ queryKey: CONTENT_KEY }).some(([, data]) => servedStale(data));
    if (changed || stale) await client.invalidateQueries({ queryKey: CONTENT_KEY });
  }
  function onFocus() {
    void handleFocus();
  }
  window.addEventListener("focus", onFocus);
  return () => window.removeEventListener("focus", onFocus);
}

/** The visit's shared data cache, kept in step with new content and progress changes in any tab. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  useEffect(() => watchContent(client), [client]);

  // Writes in this tab are handled as they happen; the channel brings other tabs' writes.
  useEffect(() => subscribeLocalChanges((stores) => refreshStores(client, stores)), [client]);
  useEffect(() => subscribeChanges((message) => message.tab !== TAB_ID && refreshStores(client, message.stores)), [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

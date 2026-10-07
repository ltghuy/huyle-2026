"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { queryClient, type InspectedEntry } from "./query-client";

const EMPTY: InspectedEntry[] = [];

function subscribeAll(listener: () => void) {
  return queryClient.subscribeAll(listener);
}

function inspect() {
  return queryClient.inspect();
}

function seconds(ms: number) {
  return `${Math.max(0, Math.round(ms / 1000))} s`;
}

function invalidateAll() {
  queryClient.invalidateQueries();
}

function clearCache() {
  queryClient.clear();
}

export function CacheInspector() {
  const entries = useSyncExternalStore(subscribeAll, inspect, () => EMPTY);
  const [now, setNow] = useState(() => Date.now());

  // Ages and countdowns tick once a second; only the inspector re-renders.
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(handle);
  }, []);

  return (
    <section aria-labelledby="inspector-heading" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="inspector-heading" className="text-sm font-semibold">
          Cache inspector
        </h3>
        <span className="text-xs text-muted-foreground">{entries.length} keys</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={invalidateAll}>
            Invalidate all
          </Button>
          <Button size="sm" variant="outline" onClick={clearCache}>
            Clear cache
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[44rem] text-left font-mono text-xs tabular-nums">
          <caption className="sr-only">Cache entries and their state</caption>
          <thead className="bg-muted/50 text-foreground/80">
            <tr>
              {["Key", "Status", "Request", "Age", "Freshness", "Users", "Requests", "Removal in", ""].map(
                (h) => (
                  <th key={h} scope="col" className="px-2 py-1.5 font-medium">
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-2 py-3 text-muted-foreground">
                  Cache is empty.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.hash} className="border-t">
                  <td className="max-w-56 truncate px-2 py-1.5" title={e.hash}>
                    {e.hash}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5",
                      e.state.status === "error" && "text-destructive",
                      e.state.status === "success" && "text-success",
                    )}
                  >
                    {e.state.status}
                  </td>
                  <td className="px-2 py-1.5">
                    {e.state.fetchStatus === "idle"
                      ? "idle"
                      : `${e.state.fetchStatus}${e.state.attempt > 1 ? ` (try ${e.state.attempt})` : ""}`}
                  </td>
                  <td className="px-2 py-1.5">
                    {e.state.dataUpdatedAt ? seconds(now - e.state.dataUpdatedAt) : "–"}
                  </td>
                  <td className="px-2 py-1.5">{e.stale ? "stale" : "fresh"}</td>
                  <td className="px-2 py-1.5">{e.observers}</td>
                  <td className="px-2 py-1.5">{e.requests}</td>
                  <td className="px-2 py-1.5">{e.gcAt ? seconds(e.gcAt - now) : "–"}</td>
                  <td className="px-2 py-1">
                    <Button size="xs" variant="ghost" onClick={() => queryClient.refetch(e.hash)}>
                      Refresh
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

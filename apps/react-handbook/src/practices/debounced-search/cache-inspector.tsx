"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/practices/toast-notifications/toast-store";

import { searchCache } from "./search-cache";
import { useCacheEntries, useNow, wallNow } from "./use-search";

function formatAge(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

function handleClearCache() {
  searchCache.clear();
  toast.info("Search cache cleared");
}

export function CacheInspector() {
  const entries = useCacheEntries();
  const now = useNow(wallNow, entries.length > 0, 1000);
  const { freshMs, maxEntries } = searchCache.getSettings();

  return (
    <section aria-labelledby="cache-heading" className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="cache-heading" className="text-sm font-semibold">
          Cache{" "}
          <span className="font-normal text-muted-foreground">
            ({entries.length} of {maxEntries}, most recently used first)
          </span>
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={handleClearCache} disabled={entries.length === 0}>
          <Trash2 aria-hidden /> Clear cache
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Empty. Successful responses are stored here by their normalized query.
        </p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead className="text-foreground/75">
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-medium">Query (key)</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Results</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Age</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">State</th>
                <th scope="col" className="py-1.5 font-medium">Hits</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const age = now - entry.storedAt;
                const fresh = age < freshMs;
                return (
                  <tr key={entry.key} className="border-b last:border-0">
                    <td className="max-w-48 truncate py-1.5 pr-3 font-mono">{entry.key}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{entry.result.total}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{formatAge(age)}</td>
                    <td className="py-1.5 pr-3">{fresh ? "Fresh" : "Stale (refreshes on use)"}</td>
                    <td className="py-1.5 tabular-nums">{entry.hits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

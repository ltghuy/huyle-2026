"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { STORAGE_KEY } from "@/lib/query-client";
import { lastChangedAt } from "@/storage/broadcast";
import type { StoreName } from "@/storage/db";

export type QueryState<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; error: unknown };

/**
 * Reads from browser storage through the shared cache. Components using the
 * same `key` share one read, and a screen opened again shows the remembered
 * result at once while it re-reads in the background, unless one of `stores`
 * was written in this tab after that result was read: then it waits for the
 * new read, so a screen opened right after a write (placement skipped, then
 * the home page) never acts on the earlier data. Re-reads whenever one of
 * `stores` changes in this tab or another one (QueryProvider). `key` must
 * hold every value `query` depends on.
 */
export function useStorageQuery<T>(
  key: readonly unknown[],
  query: () => Promise<T>,
  stores: readonly StoreName[],
): QueryState<T> & { reload: () => void } {
  const result = useQuery({ queryKey: [...STORAGE_KEY, ...key], queryFn: query, meta: { stores } });
  const { refetch } = result;
  const reload = useCallback(() => void refetch(), [refetch]);
  if (result.status === "success" && result.dataUpdatedAt >= lastChangedAt(stores)) return { status: "ready", data: result.data, reload };
  if (result.status === "error") return { status: "error", error: result.error, reload };
  return { status: "loading", reload };
}

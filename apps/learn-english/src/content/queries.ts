import { queryOptions, type QueryClient } from "@tanstack/react-query";
import type { Level } from "@/learning/types";
import { CONTENT_KEY } from "@/lib/query-client";
import { ALL_LEVELS, loadContent, type LoadedContent } from "./client";
import type { ContentKind } from "./schema";

/** How long content no screen uses stays in memory. */
export const CONTENT_GC_MS = 30 * 60 * 1000;

/**
 * Shared settings for every content query. Content changes only with a new
 * publish, which QueryProvider turns into an invalidation, so it never goes
 * stale by time. Results are thousands of items (and lookup Maps), so they
 * are replaced, not compared item by item.
 */
export const CONTENT_QUERY_DEFAULTS = { staleTime: Infinity, gcTime: CONTENT_GC_MS, structuralSharing: false } as const;

/** One kind of content for one level (or every level), loaded once per visit and shared. */
export function contentQuery<K extends ContentKind>(kind: K, level?: Level) {
  return queryOptions<LoadedContent<K>>({
    ...CONTENT_QUERY_DEFAULTS,
    queryKey: [...CONTENT_KEY, kind, level ?? ALL_LEVELS],
    queryFn: () => loadContent(kind, level),
  });
}

/** Reads one kind/level through the cache: the remembered copy, or a single shared load. */
export function fetchContent<K extends ContentKind>(client: QueryClient, kind: K, level?: Level): Promise<LoadedContent<K>> {
  return client.query(contentQuery(kind, level));
}

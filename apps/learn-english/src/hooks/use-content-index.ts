"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ContentItem } from "@/content/schema";
import { loadTombstones } from "@/content/client";
import { CONTENT_QUERY_DEFAULTS, fetchContent } from "@/content/queries";
import { LEVELS, type Level } from "@/learning/types";
import { CONTENT_KEY } from "@/lib/query-client";
import { buildContentIndex, type ContentIndex } from "@/lib/session/content-index";

export type ContentState =
  | { status: "loading" }
  | { status: "ready"; index: ContentIndex; version: number; stale: boolean }
  | { status: "error" };

type LoadedIndex = { index: ContentIndex; version: number; stale: boolean };

/** Levels whose words a learner at `level` may meet: everything up to one level above. */
export function levelsFor(level: Level): Level[] {
  return LEVELS.slice(0, Math.min(LEVELS.indexOf(level) + 2, LEVELS.length));
}

async function loadIndex(client: QueryClient, levels: readonly Level[]): Promise<LoadedIndex> {
  const requests = [
    fetchContent(client, "grammar"),
    // All levels in one small request, like grammar (feature 008).
    fetchContent(client, "forms"),
    // Specialized vocabulary sets carry their own words (feature 012).
    fetchContent(client, "set"),
    ...levels.flatMap((level) => [fetchContent(client, "word", level), fetchContent(client, "sentence", level), fetchContent(client, "writing", level)]),
  ];
  const [loaded, tombstones] = await Promise.all([Promise.all(requests), loadTombstones()]);
  const items = loaded.flatMap((entry) => entry.items as ContentItem[]);
  return {
    index: buildContentIndex(items, tombstones),
    version: Math.max(...loaded.map((entry) => entry.version)),
    stale: loaded.some((entry) => entry.stale),
  };
}

const indexQuery = (client: QueryClient, levelsKey: string) => ({
  ...CONTENT_QUERY_DEFAULTS,
  queryKey: [...CONTENT_KEY, "index", levelsKey],
  queryFn: () => loadIndex(client, levelsKey.split(",") as Level[]),
});

/** The same index as `useContentIndex(levels)`, outside a render (for event handlers). */
export function fetchContentIndex(client: QueryClient, levels: readonly Level[]): Promise<LoadedIndex> {
  return client.fetchQuery(indexQuery(client, levels.join(",")));
}

/**
 * Words, sentences and writing tasks for `levels`, plus all grammar, all
 * irregular verb forms and all vocabulary sets, in one
 * lookup index. Each kind/level is loaded once per visit and shared, and the
 * index is built once per set of levels, so a screen opened again shows its
 * content at once. Nothing loads while `levels` is null.
 */
export function useContentIndex(levels: readonly Level[] | null): ContentState & { retry: () => void } {
  const client = useQueryClient();
  const levelsKey = levels?.join(",") ?? "";
  const query = useQuery({ ...indexQuery(client, levelsKey), enabled: levelsKey !== "" });
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (query.status === "success") return { status: "ready", ...query.data, retry };
  if (query.status === "error") return { status: "error", retry };
  return { status: "loading", retry };
}

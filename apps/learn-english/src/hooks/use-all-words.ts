"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ContentItemOf } from "@/content/schema";
import { loadTombstones } from "@/content/client";
import { CONTENT_QUERY_DEFAULTS, fetchContent } from "@/content/queries";
import { LEVELS } from "@/learning/types";
import { CONTENT_KEY } from "@/lib/query-client";

export type AllWordsState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; words: readonly ContentItemOf<"word">[] };

async function loadAllWords(client: QueryClient) {
  const [loaded, tombstones] = await Promise.all([Promise.all(LEVELS.map((level) => fetchContent(client, "word", level))), loadTombstones()]);
  return {
    words: loaded.flatMap((entry) => entry.items).filter((word) => !tombstones.has(word.id)),
    stale: loaded.some((entry) => entry.stale),
  };
}

/**
 * The live words of every level, for the vocabulary search. Nothing is
 * downloaded until `enabled` turns true, so learners who never search don't
 * pay for the other levels. Levels already loaded for another screen are
 * reused.
 */
export function useAllWords(enabled: boolean): AllWordsState & { retry: () => void } {
  const client = useQueryClient();
  const query = useQuery({
    ...CONTENT_QUERY_DEFAULTS,
    queryKey: [...CONTENT_KEY, "all-words"],
    queryFn: () => loadAllWords(client),
    enabled,
  });
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (query.status === "success") return { status: "ready", words: query.data.words, retry };
  if (query.status === "error") return { status: "error", retry };
  return { status: enabled ? "loading" : "idle", retry };
}

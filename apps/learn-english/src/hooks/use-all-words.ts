"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { ContentItemOf } from "@/content/schema";
import { loadTombstones } from "@/content/client";
import { CONTENT_QUERY_DEFAULTS, fetchContent } from "@/content/queries";
import type { VocabSetItem } from "@/learning/sets";
import { LEVELS } from "@/learning/types";
import { CONTENT_KEY } from "@/lib/query-client";

export type AllWordsState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; words: readonly ContentItemOf<"word">[]; setsByWord: ReadonlyMap<string, readonly VocabSetItem[]> };

async function loadAllWords(client: QueryClient) {
  const [loaded, sets, tombstones] = await Promise.all([
    Promise.all(LEVELS.map((level) => fetchContent(client, "word", level))),
    fetchContent(client, "set"),
    loadTombstones(),
  ]);
  const words = loaded.flatMap((entry) => entry.items).filter((word) => !tombstones.has(word.id));
  const known = new Set(words.map((word) => word.id));
  const setsByWord = new Map<string, VocabSetItem[]>();
  for (const set of sets.items) {
    if (tombstones.has(set.id)) continue;
    for (const id of set.body.wordIds) setsByWord.set(id, [...(setsByWord.get(id) ?? []), set]);
    // Specialized words live only inside their sets (feature 012).
    for (const word of set.body.words) {
      if (known.has(word.id) || tombstones.has(word.id)) continue;
      known.add(word.id);
      words.push(word);
    }
  }
  return { words, setsByWord, stale: loaded.some((entry) => entry.stale) || sets.stale };
}

/**
 * The live words of every level plus the specialized words of the
 * vocabulary sets, for the vocabulary search. Nothing is
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

  if (query.status === "success") return { status: "ready", words: query.data.words, setsByWord: query.data.setsByWord, retry };
  if (query.status === "error") return { status: "error", retry };
  return { status: enabled ? "loading" : "idle", retry };
}

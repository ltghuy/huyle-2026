"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { contentQuery } from "@/content/queries";
import { verbEntries, type VerbEntry } from "@/learning/verbs";
import { useAllWords } from "./use-all-words";

export type VerbsState = { status: "loading" | "error" } | { status: "ready"; verbs: VerbEntry[] };

/**
 * Every published irregular verb with its word (feature 008): the forms come
 * in one request for all levels, the words from the shared all-levels cache
 * the vocabulary search also uses.
 */
export function useVerbs(): VerbsState & { retry: () => void } {
  const forms = useQuery(contentQuery("forms"));
  const words = useAllWords(true);
  const { refetch } = forms;
  const retryWords = words.retry;
  const retry = useCallback(() => {
    void refetch();
    retryWords();
  }, [refetch, retryWords]);

  if (forms.status === "error" || words.status === "error") return { status: "error", retry };
  if (forms.status !== "success" || words.status !== "ready") return { status: "loading", retry };
  return { status: "ready", verbs: verbEntries(forms.data.items, words.words), retry };
}

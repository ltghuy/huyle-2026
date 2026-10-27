"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentItemOf } from "@/content/schema";
import { loadContent, loadTombstones } from "@/content/client";
import { LEVELS } from "@/learning/types";

export type AllWordsState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; words: readonly ContentItemOf<"word">[] };

/**
 * The live words of every level, for the vocabulary search. Nothing is
 * downloaded until `enabled` turns true, so learners who never search don't
 * pay for the other levels.
 */
export function useAllWords(enabled: boolean): AllWordsState & { retry: () => void } {
  const [state, setState] = useState<AllWordsState>({ status: "idle" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => {
    setState({ status: "idle" });
    setTick((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    Promise.all([Promise.all(LEVELS.map((level) => loadContent("word", level))), loadTombstones()]).then(
      ([loaded, tombstones]) => {
        if (!active) return;
        const words = loaded.flatMap((entry) => entry.items).filter((word) => !tombstones.has(word.id));
        setState({ status: "ready", words });
      },
      () => active && setState({ status: "error" }),
    );
    return () => {
      active = false;
    };
  }, [enabled, tick]);

  // Idle while enabled means the download has started.
  return { ...(enabled && state.status === "idle" ? { status: "loading" } : state), retry };
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { ContentItem } from "@/content/schema";
import { loadContent, loadTombstones, refreshIfChanged } from "@/content/client";
import { LEVELS, type Level } from "@/learning/types";
import { buildContentIndex, type ContentIndex } from "@/lib/session/content-index";

export type ContentState =
  | { status: "loading" }
  | { status: "ready"; index: ContentIndex; version: number; stale: boolean }
  | { status: "error" };

/** Levels whose words a learner at `level` may meet: everything up to one level above. */
export function levelsFor(level: Level): Level[] {
  return LEVELS.slice(0, Math.min(LEVELS.indexOf(level) + 2, LEVELS.length));
}

/**
 * Loads words, sentences and writing tasks for `levels`, plus all grammar,
 * into one lookup index. Content comes from the IndexedDB cache when it is
 * current, and the hook refreshes when the window regains focus.
 */
export function useContentIndex(levels: readonly Level[] | null): ContentState & { retry: () => void } {
  const [state, setState] = useState<ContentState>({ status: "loading" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((value) => value + 1), []);
  const levelsKey = levels?.join(",") ?? "";

  useEffect(() => {
    function handleFocus() {
      void refreshIfChanged().then((changed) => changed && setTick((value) => value + 1));
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (!levelsKey) return;
    let active = true;
    const wanted = levelsKey.split(",") as Level[];
    const requests = [
      loadContent("grammar"),
      ...wanted.flatMap((level) => [loadContent("word", level), loadContent("sentence", level), loadContent("writing", level)]),
    ];
    Promise.all([Promise.all(requests), loadTombstones()]).then(
      ([loaded, tombstones]) => {
        if (!active) return;
        const items = loaded.flatMap((entry) => entry.items as ContentItem[]);
        setState({
          status: "ready",
          index: buildContentIndex(items, tombstones),
          version: Math.max(...loaded.map((entry) => entry.version)),
          stale: loaded.some((entry) => entry.stale),
        });
      },
      () => active && setState({ status: "error" }),
    );
    return () => {
      active = false;
    };
  }, [levelsKey, tick]);

  return { ...state, retry };
}

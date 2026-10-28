"use client";

import { useMemo } from "react";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { getAllCards } from "@/storage/cards";

const STORES = ["cards"] as const;

async function loadCardIds(): Promise<string[]> {
  return (await getAllCards()).map((card) => card.itemId);
}

/**
 * Ids of every word and grammar point with a review card, kept live across
 * tabs. "Learned" means a card exists. `ids` is null until storage answers.
 */
export function useCardIds(): { ids: ReadonlySet<string> | null; failed: boolean; reload: () => void } {
  const query = useStorageQuery(["card-ids"], loadCardIds, STORES);
  const data = query.status === "ready" ? query.data : null;
  const ids = useMemo(() => (data ? new Set(data) : null), [data]);
  return { ids, failed: query.status === "error", reload: query.reload };
}

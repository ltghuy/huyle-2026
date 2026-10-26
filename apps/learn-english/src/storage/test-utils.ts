import { IDBFactory } from "fake-indexeddb";
import type { Attempt, StoredCard } from "@/learning/types";
import { closeDb } from "./db";

/** Gives the next `getDb()` a fresh, empty fake IndexedDB. */
export async function resetStorage(): Promise<void> {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
}

export function makeCard(itemId: StoredCard["itemId"], due: number, extra: Partial<StoredCard> = {}): StoredCard {
  return {
    itemId,
    due,
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    addedAt: 0,
    updatedAt: 0,
    ...extra,
  };
}

export function makeAttempt(id: string, itemId: string, at: number, extra: Partial<Attempt> = {}): Attempt {
  return {
    id,
    itemId,
    at,
    correct: true,
    ms: 2000,
    hinted: false,
    typo: false,
    selfMarked: false,
    exercise: "mcq",
    context: "lesson",
    rating: "good",
    ...extra,
  };
}

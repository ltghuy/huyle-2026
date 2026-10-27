import type { CountedExerciseKind } from "@/server/stats/stats.schema";
import { getDb } from "@/storage/db";

// Today's anonymous usage counters, kept in the IndexedDB `meta` store under
// one key. `total` is everything counted on `day`; `sent` is the part already
// reported, so a report only carries the difference and nothing is counted twice.

export const STATS_KEY = "stats-today";

export interface DayCounts {
  lessonsCompleted: number;
  placementDone: boolean;
  exercises: Partial<Record<CountedExerciseKind, number>>;
  wrongWords: Record<string, number>;
}

export interface StatsToday {
  day: string;
  total: DayCounts;
  sent: DayCounts;
}

export const emptyCounts = (): DayCounts => ({ lessonsCompleted: 0, placementDone: false, exercises: {}, wrongWords: {} });

export const emptyDay = (day: string): StatsToday => ({ day, total: emptyCounts(), sent: emptyCounts() });

/**
 * Reads, changes and writes the record in one transaction (so two tabs can't
 * lose each other's counts) and returns what `change` returns. `change` must
 * be synchronous: it receives the stored record (or undefined) and returns the
 * record to store plus a result.
 */
export async function updateStats<T>(change: (current: StatsToday | undefined) => { next: StatsToday; result: T }): Promise<T> {
  const db = await getDb();
  let result: T | undefined;
  await db.transaction(["meta"], async (tx) => {
    const current = (await tx.get("meta", STATS_KEY))?.value as StatsToday | undefined;
    const changed = change(current);
    result = changed.result;
    await tx.put("meta", { key: STATS_KEY, value: changed.next });
  });
  return result as T;
}

export async function getStats(): Promise<StatsToday | undefined> {
  return (await (await getDb()).get("meta", STATS_KEY))?.value as StatsToday | undefined;
}

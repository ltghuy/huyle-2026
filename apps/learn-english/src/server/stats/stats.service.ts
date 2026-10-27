import "server-only";
import { sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { statsDaily, statsDevices } from "@/server/db/schema";
import { MAX_WRONG_WORDS, type StatsPayload } from "./stats.schema";

export type StatMetric = "lesson_completed" | "placement_done" | "exercise" | "word_wrong";

export interface Counter {
  metric: StatMetric;
  key: string;
  count: number;
}

/**
 * The counters one beacon adds, without zero counts. Wrong words are clamped
 * to the `MAX_WRONG_WORDS` largest counts (ties broken by id, so the result
 * doesn't depend on key order).
 */
export function countersOf(payload: StatsPayload): Counter[] {
  const counters: Counter[] = [];
  if (payload.lessonsCompleted > 0) counters.push({ metric: "lesson_completed", key: "", count: payload.lessonsCompleted });
  if (payload.placementDone) counters.push({ metric: "placement_done", key: "", count: 1 });
  for (const [kind, count] of Object.entries(payload.exercises)) {
    if (count) counters.push({ metric: "exercise", key: kind, count });
  }
  const words = Object.entries(payload.wrongWords)
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, MAX_WRONG_WORDS);
  for (const [wordId, count] of words) counters.push({ metric: "word_wrong", key: wordId, count });
  return counters;
}

/** SHA-256 hex of deviceId + day + salt: countable per day, unlinkable across days. */
export async function hashDevice(deviceId: string, day: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(deviceId + day + salt));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Adds one device's counters for a day in a single `db.batch()` (one D1 call).
 *
 * D1 writes per beacon: 1 device row (ignored when it's already counted) plus
 * one upsert per non-zero counter, at most 1 + 1 + 10 exercise kinds + 20
 * words = 33 statements. A typical day (a lesson, 4 to 6 exercise kinds, a
 * few missed words) is about 10 to 15, inside the ~25 per device per day the
 * design budgets. The raw deviceId is never written.
 */
export async function recordStats(db: Db, payload: StatsPayload, salt: string): Promise<void> {
  const deviceHash = await hashDevice(payload.deviceId, payload.day, salt);
  const counters = countersOf(payload);
  const upserts = counters.map((counter) =>
    db
      .insert(statsDaily)
      .values({ day: payload.day, ...counter })
      .onConflictDoUpdate({
        target: [statsDaily.day, statsDaily.metric, statsDaily.key],
        set: { count: sql`${statsDaily.count} + excluded.count` },
      }),
  );
  await db.batch([db.insert(statsDevices).values({ day: payload.day, deviceHash }).onConflictDoNothing(), ...upserts]);
}

import "server-only";
import { eq, lt, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { presence } from "@/server/db/schema";
import { ONLINE_WINDOW_MS, PRESENCE_WRITE_MS } from "./social.schema";

// When each learner was last active (feature 031). Every open tab pulses once a minute; the
// stored time is only rewritten when it is stale or the learner had left, so several tabs and
// devices cost about one written row per learner per 45 s (D1's free plan counts writes).

/**
 * The upsert a pulse runs, as a statement for the pulse's batch. It changes no row while the
 * stored time is fresh and the learner hasn't left.
 */
export function touchPresence(db: Db, userId: string, now: number) {
  return db
    .insert(presence)
    .values({ userId, lastSeenAt: now, left: false })
    .onConflictDoUpdate({
      target: presence.userId,
      set: { lastSeenAt: now, left: false },
      setWhere: or(eq(presence.left, true), lt(presence.lastSeenAt, now - PRESENCE_WRITE_MS)),
    });
}

/** The last open tab said goodbye: offline at once, last active now. */
export async function leave(db: Db, userId: string, now: number): Promise<void> {
  await db
    .insert(presence)
    .values({ userId, lastSeenAt: now, left: true })
    .onConflictDoUpdate({ target: presence.userId, set: { lastSeenAt: sql`max(${presence.lastSeenAt}, ${now})`, left: true } });
}

/** Online: seen within the window and the last tab hasn't said goodbye since. */
export function isOnline(row: { lastSeenAt: number | null; left: boolean | null }, now: number): boolean {
  return row.lastSeenAt !== null && !row.left && row.lastSeenAt > now - ONLINE_WINDOW_MS;
}

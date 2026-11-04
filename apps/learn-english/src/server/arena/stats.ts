// Arena win/loss stats (feature 023, AC-029/AC-030). The room writes them when a
// match ends and the stats route reads them, so `db` is passed in: the room has
// no Next.js request context for `getDb()`.
//
// No `import "server-only"`: the room, bundled into `worker.ts`, imports this module.
import { eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { arenaStats } from "@/server/db/schema";

export interface ArenaStats {
  wins: number;
  losses: number;
  /** Wins in a row, up to the last match. */
  streak: number;
  bestStreak: number;
}

export const NO_STATS: ArenaStats = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };

/** One win for the winner (their run grows), one loss for the loser (their run ends), in one batch. */
export async function recordResult(db: Db, winnerId: string, loserId: string, now: number): Promise<void> {
  await db.batch([
    db
      .insert(arenaStats)
      .values({ userId: winnerId, wins: 1, losses: 0, streak: 1, bestStreak: 1, updatedAt: now })
      .onConflictDoUpdate({
        target: arenaStats.userId,
        // In an upsert the columns still hold the old row, so the new run is `streak + 1`.
        set: {
          wins: sql`${arenaStats.wins} + 1`,
          streak: sql`${arenaStats.streak} + 1`,
          bestStreak: sql`max(${arenaStats.bestStreak}, ${arenaStats.streak} + 1)`,
          updatedAt: now,
        },
      }),
    db
      .insert(arenaStats)
      .values({ userId: loserId, wins: 0, losses: 1, streak: 0, bestStreak: 0, updatedAt: now })
      .onConflictDoUpdate({
        target: arenaStats.userId,
        set: { losses: sql`${arenaStats.losses} + 1`, streak: 0, updatedAt: now },
      }),
  ]);
}

export async function getStats(db: Db, userId: string): Promise<ArenaStats> {
  const [row] = await db
    .select({ wins: arenaStats.wins, losses: arenaStats.losses, streak: arenaStats.streak, bestStreak: arenaStats.bestStreak })
    .from(arenaStats)
    .where(eq(arenaStats.userId, userId))
    .limit(1);
  return row ?? NO_STATS;
}

// Arena match history (feature 025): the room saves both players' entries when a
// match ends, and the history route reads the learner's newest. `db` is passed
// in, as in `stats.ts`: the room has no Next.js request context.
//
// No `import "server-only"`: the room, bundled into `worker.ts`, imports this module.
import { and, desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { HISTORY_LIMIT, type HistoryEntry } from "@/learning/arena/history";
import type { MatchSettings } from "@/learning/arena/protocol";
import type { Db } from "@/server/db";
import { arenaMatches, arenaStats } from "@/server/db/schema";
import type { ArenaMatch, ArenaMatchesResponse } from "./arena.schema";
import { NO_STATS } from "./stats";

const roundsSchema = z.array(
  z.object({ round: z.number().int(), mine: z.number().int(), theirs: z.number().int(), won: z.boolean(), suddenDeath: z.boolean(), onTime: z.boolean() }),
);

const NEWEST = [desc(arenaMatches.endedAt), desc(arenaMatches.matchId)] as const;

/**
 * Saves a match's entries and keeps each owner's newest {@link HISTORY_LIMIT}, in one batch. A
 * match already saved (same id) is left as it is.
 */
export async function recordMatch(db: Db, entries: HistoryEntry[]): Promise<void> {
  const [first, ...rest] = entries.map((entry) => entry.userId);
  if (!first) return;
  const prune = (userId: string) =>
    db
      .delete(arenaMatches)
      .where(
        and(
          eq(arenaMatches.userId, userId),
          notInArray(
            arenaMatches.matchId,
            db
              .select({ id: arenaMatches.matchId })
              .from(arenaMatches)
              .where(eq(arenaMatches.userId, userId))
              .orderBy(...NEWEST)
              .limit(HISTORY_LIMIT),
          ),
        ),
      );
  await db.batch([
    db
      .insert(arenaMatches)
      .values(
        entries.map((entry) => ({
          matchId: entry.matchId,
          userId: entry.userId,
          opponentId: entry.opponentId,
          opponentName: entry.opponentName,
          opponentImage: entry.opponentImage,
          won: entry.won,
          forfeit: entry.forfeit,
          roundsWon: entry.roundsWon,
          opponentRoundsWon: entry.opponentRoundsWon,
          rounds: JSON.stringify(entry.rounds),
          mode: entry.settings.mode,
          level: entry.settings.level,
          bestOf: entry.settings.rounds,
          endedAt: entry.endedAt,
        })),
      )
      .onConflictDoNothing(),
    prune(first),
    ...rest.map(prune),
  ]);
}

/** The learner's record and newest matches, in one round trip. */
export async function listHistory(db: Db, userId: string): Promise<ArenaMatchesResponse> {
  const [stats, rows] = await db.batch([
    db
      .select({ wins: arenaStats.wins, losses: arenaStats.losses, streak: arenaStats.streak, bestStreak: arenaStats.bestStreak })
      .from(arenaStats)
      .where(eq(arenaStats.userId, userId))
      .limit(1),
    db
      .select()
      .from(arenaMatches)
      .where(eq(arenaMatches.userId, userId))
      .orderBy(...NEWEST)
      .limit(HISTORY_LIMIT),
  ]);
  return { stats: stats[0] ?? NO_STATS, matches: rows.map(toMatch) };
}

function toMatch(row: typeof arenaMatches.$inferSelect): ArenaMatch {
  return {
    id: row.matchId,
    endedAt: row.endedAt,
    won: row.won,
    forfeit: row.forfeit,
    score: { mine: row.roundsWon, theirs: row.opponentRoundsWon },
    opponent: row.opponentId && row.opponentName ? { id: row.opponentId, name: row.opponentName, image: row.opponentImage } : null,
    // Written by the room from its validated settings.
    settings: { mode: row.mode, level: row.level, rounds: row.bestOf } as MatchSettings,
    // A row whose rounds don't parse still shows, without them.
    rounds: parseRounds(row.rounds),
  };
}

function parseRounds(json: string): ArenaMatch["rounds"] {
  try {
    const parsed = roundsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

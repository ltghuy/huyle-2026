// Arena match history (feature 025): the room saves both players' entries when a
// match ends, and the history route reads the learner's newest. `db` is passed
// in, as in `stats.ts`: the room has no Next.js request context.
//
// No `import "server-only"`: the room, bundled into `worker.ts`, imports this module.
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { HISTORY_LIMIT, type HistoryEntry, type HistoryMember } from "@/learning/arena/history";
import type { MatchSettings } from "@/learning/arena/protocol";
import type { Db } from "@/server/db";
import { arenaMatchPlayers, arenaMatches, arenaStats } from "@/server/db/schema";
import type { ArenaMatch, ArenaMatchesResponse } from "./arena.schema";
import { NO_STATS } from "./stats";

const roundsSchema = z.array(
  z.object({ round: z.number().int(), mine: z.number().int(), theirs: z.number().int(), won: z.boolean(), suddenDeath: z.boolean(), onTime: z.boolean() }),
);

const NEWEST = [desc(arenaMatches.endedAt), desc(arenaMatches.matchId)] as const;

/**
 * Saves a match's entries (and a team match's members, feature 039) and keeps each owner's newest
 * {@link HISTORY_LIMIT}, in one batch. A match already saved (same id) is left as it is; members of
 * matches no owner keeps any more go too.
 */
export async function recordMatch(db: Db, entries: HistoryEntry[], members: HistoryMember[] = []): Promise<void> {
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
          kind: entry.team ? "team" : "duel",
          team: entry.team ?? null,
          draw: entry.draw ?? false,
        })),
      )
      .onConflictDoNothing(),
    ...(members.length > 0 ? [db.insert(arenaMatchPlayers).values(members).onConflictDoNothing()] : []),
    prune(first),
    ...rest.map(prune),
    // Matches only team rows point at: once no owner keeps one, its members go.
    db.delete(arenaMatchPlayers).where(sql`NOT EXISTS (SELECT 1 FROM ${arenaMatches} WHERE ${arenaMatches.matchId} = ${arenaMatchPlayers.matchId})`),
  ]);
}

/** The learner's record and newest matches, with team matches' players, in one round trip. */
export async function listHistory(db: Db, userId: string): Promise<ArenaMatchesResponse> {
  const newest = db.select({ id: arenaMatches.matchId }).from(arenaMatches).where(eq(arenaMatches.userId, userId)).orderBy(...NEWEST).limit(HISTORY_LIMIT);
  const [stats, rows, members] = await db.batch([
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
    db.select().from(arenaMatchPlayers).where(inArray(arenaMatchPlayers.matchId, newest)).orderBy(arenaMatchPlayers.position),
  ]);
  return { stats: stats[0] ?? NO_STATS, matches: rows.map((row) => toMatch(row, members)) };
}

type MemberRow = typeof arenaMatchPlayers.$inferSelect;

function teamOf(row: typeof arenaMatches.$inferSelect, members: MemberRow[]): ArenaMatch["team"] {
  if (row.kind !== "team" || (row.team !== "A" && row.team !== "B")) return undefined;
  const of = (team: "A" | "B") =>
    members.filter((m) => m.matchId === row.matchId && m.team === team).map((m) => ({ id: m.userId, name: m.name, image: m.image }));
  return { mine: row.team, draw: row.draw, members: { A: of("A"), B: of("B") } };
}

function toMatch(row: typeof arenaMatches.$inferSelect, members: MemberRow[]): ArenaMatch {
  const team = teamOf(row, members);
  return {
    ...(team ? { team } : {}),
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

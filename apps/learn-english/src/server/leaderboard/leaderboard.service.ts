import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { BOARD_NEIGHBOURS, type BoardRow } from "@/learning/leaderboard";
import type { Db } from "@/server/db";
import { leaderboardEntries as entries } from "@/server/db/schema";
import type { SubmitResponse } from "./leaderboard.schema";

// The weekly board (feature 007). Every request is one `db.batch()`: the
// guarded write, then the reads that rank the learner against the row it just
// wrote. A row only changes when the stored secret hash matches.

const DAY_MS = 86_400_000;
/** Rows nobody updated for this long are deleted. */
export const RETENTION_MS = 90 * DAY_MS;
/** At most this many stale rows are deleted per request, to keep it cheap. */
export const CLEANUP_LIMIT = 50;

export interface EntryInput {
  id: string;
  tokenHash: string;
  name: string;
  week: string;
  points: number;
  previousPoints: number;
}

export type SubmitResult = ({ ok: true } & SubmitResponse) | { ok: false; reason: "forbidden" };

function staleRowsCleanup(db: Db, now: number) {
  // SQLite in D1 has no DELETE … LIMIT, so the limit goes in a subquery.
  return db.delete(entries).where(
    inArray(entries.id, db.select({ id: entries.id }).from(entries).where(lt(entries.updatedAt, now - RETENTION_MS)).limit(CLEANUP_LIMIT)),
  );
}

/**
 * Writes the learner's weekly points and ranks them. Ties go to whoever
 * reached the points first (`reached_at`), which a rename doesn't reset.
 * The previous place counts learners with more points than the learner had
 * before this lesson, so a tie then is not counted as overtaken.
 */
export async function submitEntry(db: Db, input: EntryInput, now: number): Promise<SubmitResult> {
  const me = alias(entries, "me");
  const other = alias(entries, "other");
  const sameWeek = and(eq(me.id, input.id), eq(other.week, me.week), ne(other.id, me.id));
  const ahead = or(gt(other.points, me.points), and(eq(other.points, me.points), lt(other.reachedAt, me.reachedAt)));
  const behind = or(lt(other.points, me.points), and(eq(other.points, me.points), gte(other.reachedAt, me.reachedAt)));
  const neighbour = { name: other.name, points: other.points };

  const write = db
    .insert(entries)
    .values({ ...input, reachedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: entries.id,
      set: {
        name: sql`excluded.name`,
        week: sql`excluded.week`,
        points: sql`excluded.points`,
        reachedAt: sql`CASE WHEN ${entries.week} = excluded.week AND ${entries.points} = excluded.points THEN ${entries.reachedAt} ELSE excluded.reached_at END`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: eq(entries.tokenHash, sql`excluded.token_hash`),
    })
    .returning({ name: entries.name, points: entries.points });

  const [, written, aheadCount, previouslyAhead, total, above, below] = await db.batch([
    staleRowsCleanup(db, now),
    write,
    db.select({ n: count() }).from(other).innerJoin(me, sameWeek).where(ahead),
    db
      .select({ n: count() })
      .from(entries)
      .where(and(eq(entries.week, input.week), ne(entries.id, input.id), gt(entries.points, input.previousPoints))),
    db.select({ n: count() }).from(entries).where(eq(entries.week, input.week)),
    db.select(neighbour).from(other).innerJoin(me, sameWeek).where(ahead).orderBy(asc(other.points), desc(other.reachedAt)).limit(BOARD_NEIGHBOURS),
    db.select(neighbour).from(other).innerJoin(me, sameWeek).where(behind).orderBy(desc(other.points), asc(other.reachedAt)).limit(BOARD_NEIGHBOURS),
  ]);
  if (!written[0]) return { ok: false, reason: "forbidden" };

  const rank = aheadCount[0].n + 1;
  const rows: BoardRow[] = [
    ...[...above].reverse().map((row, i, list) => ({ ...row, position: rank - list.length + i, me: false })),
    { ...written[0], position: rank, me: true },
    ...below.map((row, i) => ({ ...row, position: rank + i + 1, me: false })),
  ];
  return { ok: true, rank, previousRank: previouslyAhead[0].n + 1, total: total[0].n, rows };
}

/** Deletes the entry when the secret matches. "forbidden" when it exists under another secret. */
export async function removeEntry(db: Db, id: string, tokenHash: string): Promise<{ ok: true } | { ok: false; reason: "forbidden" }> {
  const [, remaining] = await db.batch([
    db.delete(entries).where(and(eq(entries.id, id), eq(entries.tokenHash, tokenHash))),
    db.select({ id: entries.id }).from(entries).where(eq(entries.id, id)).limit(1),
  ]);
  return remaining[0] ? { ok: false, reason: "forbidden" } : { ok: true };
}

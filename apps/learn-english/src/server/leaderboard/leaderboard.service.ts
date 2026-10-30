import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm";
import { alias, type SQLiteColumn } from "drizzle-orm/sqlite-core";
import { DAILY_POINTS } from "@/learning/attendance";
import { BOARD_NEIGHBOURS, BONUS_ALLOWANCE, previousDay, type BoardRow } from "@/learning/leaderboard";
import type { Db } from "@/server/db";
import { leaderboardEntries as entries } from "@/server/db/schema";
import type { SubmitResponse } from "./leaderboard.schema";

// The board (feature 007, ranked by streak since 013). Every request is one
// `db.batch()`: the guarded write, then the reads that rank the learner against
// the row it just wrote. A row only changes when the stored secret hash
// matches and the new numbers could have been earned since the last report.

const DAY_MS = 86_400_000;
/** Rows nobody updated for this long are deleted. */
export const RETENTION_MS = 90 * DAY_MS;
/** At most this many stale rows are deleted per request, to keep it cheap. */
export const CLEANUP_LIMIT = 50;

export interface EntryInput {
  id: string;
  tokenHash: string;
  name: string;
  /** The learner's local date: rows whose last lesson is before yesterday are left off. */
  today: string;
  lastDate: string;
  streak: number;
  earned: number;
  previousStreak: number;
  previousEarned: number;
}

export type SubmitResult = ({ ok: true } & SubmitResponse) | { ok: false; reason: "forbidden" | "implausible" };

function staleRowsCleanup(db: Db, now: number) {
  // SQLite in D1 has no DELETE … LIMIT, so the limit goes in a subquery.
  return db.delete(entries).where(
    inArray(entries.id, db.select({ id: entries.id }).from(entries).where(lt(entries.updatedAt, now - RETENTION_MS)).limit(CLEANUP_LIMIT)),
  );
}

/**
 * Writes the learner's streak and points ever earned and ranks them among the
 * learners whose streak is still alive (last daily lesson today or yesterday,
 * AC-013): longer streak first, then more points, then whoever reached that
 * streak first (`reached_at`, which a rename doesn't reset, AC-011). The
 * previous place counts learners ranked above the learner's numbers before
 * this lesson, so a tie then is not counted as overtaken.
 *
 * A report older than the stored one (a device that was offline) changes only
 * the name. A newer one may grow the streak by at most one per day since the
 * stored report, and the points by what those days can award (AC-016).
 */
export async function submitEntry(db: Db, input: EntryInput, now: number): Promise<SubmitResult> {
  const me = alias(entries, "me");
  const other = alias(entries, "other");
  const visibleSince = previousDay(input.today);
  const visible = (lastDate: SQLiteColumn) => gte(lastDate, visibleSince);
  const others = and(eq(me.id, input.id), ne(other.id, me.id), visible(other.lastDate));
  const ahead = or(
    gt(other.streak, me.streak),
    and(eq(other.streak, me.streak), or(gt(other.earned, me.earned), and(eq(other.earned, me.earned), lt(other.reachedAt, me.reachedAt)))),
  );
  const behind = or(
    lt(other.streak, me.streak),
    and(eq(other.streak, me.streak), or(lt(other.earned, me.earned), and(eq(other.earned, me.earned), gte(other.reachedAt, me.reachedAt)))),
  );
  const neighbour = { name: other.name, streak: other.streak, earned: other.earned };

  const newer = sql`excluded.last_date >= ${entries.lastDate}`;
  const keepOrNew = (column: string) => sql.raw(`CASE WHEN excluded.last_date >= last_date THEN excluded.${column} ELSE ${column} END`);
  const days = sql`(julianday(excluded.last_date) - julianday(${entries.lastDate}))`;
  const plausible = or(
    eq(entries.lastDate, ""),
    sql`excluded.last_date < ${entries.lastDate}`,
    and(sql`excluded.streak <= ${entries.streak} + ${days}`, sql`excluded.earned <= ${entries.earned} + ${days} * ${DAILY_POINTS} + ${BONUS_ALLOWANCE}`),
  );

  const { id, tokenHash, name, lastDate, streak, earned } = input;
  const write = db
    .insert(entries)
    .values({ id, tokenHash, name, lastDate, streak, earned, reachedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: entries.id,
      set: {
        name: sql`excluded.name`,
        streak: keepOrNew("streak"),
        earned: keepOrNew("earned"),
        lastDate: keepOrNew("last_date"),
        reachedAt: sql`CASE WHEN NOT (${newer}) OR (${entries.streak} = excluded.streak AND ${entries.earned} = excluded.earned) THEN ${entries.reachedAt} ELSE excluded.reached_at END`,
        updatedAt: sql`excluded.updated_at`,
      },
      setWhere: and(eq(entries.tokenHash, sql`excluded.token_hash`), plausible),
    })
    .returning({ name: entries.name, streak: entries.streak, earned: entries.earned });

  const [, written, owned, aheadCount, previouslyAhead, total, above, below] = await db.batch([
    staleRowsCleanup(db, now),
    write,
    db.select({ id: entries.id }).from(entries).where(and(eq(entries.id, input.id), eq(entries.tokenHash, input.tokenHash))).limit(1),
    db.select({ n: count() }).from(other).innerJoin(me, others).where(ahead),
    db
      .select({ n: count() })
      .from(entries)
      .where(
        and(
          ne(entries.id, input.id),
          visible(entries.lastDate),
          or(gt(entries.streak, input.previousStreak), and(eq(entries.streak, input.previousStreak), gt(entries.earned, input.previousEarned))),
        ),
      ),
    db.select({ n: count() }).from(entries).where(and(ne(entries.id, input.id), visible(entries.lastDate))),
    db.select(neighbour).from(other).innerJoin(me, others).where(ahead).orderBy(asc(other.streak), asc(other.earned), desc(other.reachedAt)).limit(BOARD_NEIGHBOURS),
    db.select(neighbour).from(other).innerJoin(me, others).where(behind).orderBy(desc(other.streak), desc(other.earned), asc(other.reachedAt)).limit(BOARD_NEIGHBOURS),
  ]);
  if (!written[0]) return { ok: false, reason: owned[0] ? "implausible" : "forbidden" };

  const rank = aheadCount[0].n + 1;
  const rows: BoardRow[] = [
    ...[...above].reverse().map((row, i, list) => ({ ...row, position: rank - list.length + i, me: false })),
    { ...written[0], position: rank, me: true },
    ...below.map((row, i) => ({ ...row, position: rank + i + 1, me: false })),
  ];
  return { ok: true, rank, previousRank: previouslyAhead[0].n + 1, total: total[0].n + 1, rows };
}

/** Deletes the entry when the secret matches. "forbidden" when it exists under another secret. */
export async function removeEntry(db: Db, id: string, tokenHash: string): Promise<{ ok: true } | { ok: false; reason: "forbidden" }> {
  const [, remaining] = await db.batch([
    db.delete(entries).where(and(eq(entries.id, id), eq(entries.tokenHash, tokenHash))),
    db.select({ id: entries.id }).from(entries).where(eq(entries.id, id)).limit(1),
  ]);
  return remaining[0] ? { ok: false, reason: "forbidden" } : { ok: true };
}

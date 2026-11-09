import "server-only";
import { and, count, countDistinct, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import type { Db } from "@/server/db";
import { arenaMatches, claims, presence, statsDaily, statsDevices, user } from "@/server/db/schema";
import type { AdminOverview, OverviewRange } from "./admin.schema";

// "Tổng quan" on the admin page (feature 038, AC-006 to AC-008), read in one `db.batch()`.
// Days are Vietnam days (UTC+7, no daylight saving). Account counts other than the total
// leave out learners who turned off anonymous stats, as `pnpm stats:report` does.

const DAY_MS = 86_400_000;
/** Asia/Ho_Chi_Minh is UTC+7 all year. */
const VN_OFFSET_MS = 7 * 3_600_000;
const RANGE_DAYS: Record<OverviewRange, number> = { today: 1, week: 7, month: 30 };
const TOP_WORDS = 10;

/** Epoch ms of the Vietnam midnight `daysBack` days before today's. */
export function vnDayStart(now: number, daysBack = 0): number {
  return Math.floor((now + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS - daysBack * DAY_MS;
}

/** The Vietnam date (YYYY-MM-DD) of an instant. */
export function vnDay(time: number): string {
  return new Date(time + VN_OFFSET_MS).toISOString().slice(0, 10);
}

const counted = sql`${user.statsOptOut} = 0`;
// Each count needs its own alias: the D1 batch maps rows by column name, and the three windows
// would otherwise share one SQL text and collapse into a single column (knowledge.md, 031).
const since = (column: typeof user.createdAt | typeof presence.lastSeenAt, start: number, alias: string) =>
  sql<number>`coalesce(sum(case when ${counted} and ${column} >= ${start} then 1 else 0 end), 0)`.as(alias);

export async function getOverview(db: Db, range: OverviewRange, now: number): Promise<AdminOverview> {
  const today = vnDayStart(now);
  const week = vnDayStart(now, 6);
  const month = vnDayStart(now, 29);
  const rangeStart = vnDayStart(now, RANGE_DAYS[range] - 1);
  const from = vnDay(rangeStart);
  const to = vnDay(now);
  const inRange = (column: typeof statsDaily.day | typeof statsDevices.day) => and(gte(column, from), lte(column, to));

  const [accounts, pending, devices, totals, wrongWords, matches] = await db.batch([
    db
      .select({
        total: count(),
        createdToday: since(user.createdAt, today, "created_today"),
        createdWeek: since(user.createdAt, week, "created_week"),
        createdMonth: since(user.createdAt, month, "created_month"),
        activeToday: since(presence.lastSeenAt, today, "active_today"),
        activeWeek: since(presence.lastSeenAt, week, "active_week"),
        activeMonth: since(presence.lastSeenAt, month, "active_month"),
      })
      .from(user)
      .leftJoin(presence, eq(presence.userId, user.id)),
    db.select({ n: count() }).from(claims).where(eq(claims.status, "pending")),
    db.select({ day: statsDevices.day, devices: count() }).from(statsDevices).where(inRange(statsDevices.day)).groupBy(statsDevices.day).orderBy(statsDevices.day),
    db
      .select({ metric: statsDaily.metric, key: statsDaily.key, total: sum(statsDaily.count).mapWith(Number) })
      .from(statsDaily)
      .where(and(inRange(statsDaily.day), sql`${statsDaily.metric} in ('lesson_completed', 'placement_done', 'exercise')`))
      .groupBy(statsDaily.metric, statsDaily.key),
    db
      .select({ wordId: statsDaily.key, wrong: sum(statsDaily.count).mapWith(Number) })
      .from(statsDaily)
      .where(and(inRange(statsDaily.day), eq(statsDaily.metric, "word_wrong")))
      .groupBy(statsDaily.key)
      .orderBy(desc(sum(statsDaily.count)), statsDaily.key)
      .limit(TOP_WORDS),
    // Each match has a row per player: count matches, not rows.
    db.select({ n: countDistinct(arenaMatches.matchId) }).from(arenaMatches).where(gte(arenaMatches.endedAt, rangeStart)),
  ]);

  const row = accounts[0];
  const metric = (name: string) => totals.filter((entry) => entry.metric === name).reduce((acc, entry) => acc + (entry.total ?? 0), 0);
  return {
    now,
    range,
    from,
    to,
    accounts: {
      total: row?.total ?? 0,
      created: { today: Number(row?.createdToday ?? 0), week: Number(row?.createdWeek ?? 0), month: Number(row?.createdMonth ?? 0) },
      active: { today: Number(row?.activeToday ?? 0), week: Number(row?.activeWeek ?? 0), month: Number(row?.activeMonth ?? 0) },
    },
    pendingClaims: pending[0]?.n ?? 0,
    devices,
    lessons: metric("lesson_completed"),
    placements: metric("placement_done"),
    exercises: totals
      .filter((entry) => entry.metric === "exercise")
      .map((entry) => ({ kind: entry.key, answered: entry.total ?? 0 }))
      .sort((a, b) => b.answered - a.answered || a.kind.localeCompare(b.kind)),
    wrongWords: wrongWords.map((entry) => ({ wordId: entry.wordId, wrong: entry.wrong ?? 0 })),
    arenaMatches: matches[0]?.n ?? 0,
  };
}

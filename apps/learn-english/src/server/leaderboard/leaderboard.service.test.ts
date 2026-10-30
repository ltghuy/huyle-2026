// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { CLEANUP_LIMIT, RETENTION_MS, removeEntry, submitEntry, type EntryInput } from "./leaderboard.service";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-20T10:00:00Z");
const TODAY = "2026-11-20";
const YESTERDAY = "2026-11-19";
let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Learner `n` reporting a `streak`-day streak with `earned` points after today's lesson. */
const entry = (n: number, streak: number, earned = streak * 20, extra: Partial<EntryInput> = {}): EntryInput => ({
  id: id(n),
  tokenHash: `hash-${n}`,
  name: `Learner ${n}`,
  today: TODAY,
  lastDate: TODAY,
  streak,
  earned,
  previousStreak: Math.max(0, streak - 1),
  previousEarned: Math.max(0, earned - 20),
  ...extra,
});

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
});

describe("submitEntry (013)", () => {
  it("ranks by streak, before and after this lesson, with up to 3 rows above and below (AC-010, AC-012)", async () => {
    // Eight learners on 16, 14, … 2-day streaks.
    for (let n = 1; n <= 8; n++) await submitEntry(db, entry(n, 18 - n * 2), NOW + n);
    // Learner 9 was on 5 days (7th of 9) and is now on 9: 5th.
    const result = await submitEntry(db, entry(9, 9, 180, { previousStreak: 5, previousEarned: 160 }), NOW + 100);
    expect(result).toMatchObject({ ok: true, rank: 5, previousRank: 7, total: 9 });
    if (!result.ok) return;
    expect(result.rows.map((row) => [row.position, row.name, row.streak, row.me])).toEqual([
      [2, "Learner 2", 14, false],
      [3, "Learner 3", 12, false],
      [4, "Learner 4", 10, false],
      [5, "Learner 9", 9, true],
      [6, "Learner 5", 8, false],
      [7, "Learner 6", 6, false],
      [8, "Learner 7", 4, false],
    ]);
  });

  it("breaks a tie by points ever earned, then by who reached the streak first (AC-011)", async () => {
    await submitEntry(db, entry(1, 5, 100), NOW);
    await submitEntry(db, entry(2, 5, 140), NOW + 1);
    await submitEntry(db, entry(3, 5, 100), NOW + 2);
    expect(await submitEntry(db, entry(1, 5, 100, { name: "Renamed" }), NOW + 3)).toMatchObject({ ok: true, rank: 2 });
    expect(await submitEntry(db, entry(3, 5, 100), NOW + 4)).toMatchObject({ ok: true, rank: 3 });
  });

  it("leaves off learners whose last lesson was before yesterday, and rows from the weekly board (AC-013)", async () => {
    await submitEntry(db, entry(1, 30, 600, { lastDate: "2026-11-18", previousStreak: 30, previousEarned: 600 }), NOW);
    await submitEntry(db, entry(2, 3, 60, { lastDate: YESTERDAY, previousStreak: 3, previousEarned: 60 }), NOW);
    sqlite.prepare("INSERT INTO leaderboard_entries (id, token_hash, name, reached_at, updated_at) VALUES ('old', 'h', 'Old', 0, ?)").run(NOW);
    const result = await submitEntry(db, entry(3, 1), NOW + 1);
    expect(result).toMatchObject({ ok: true, rank: 2, total: 2 });
  });

  it("refuses a streak that grew faster than one day per day since the last report (AC-016)", async () => {
    await submitEntry(db, entry(1, 4, 80, { lastDate: YESTERDAY }), NOW);
    expect(await submitEntry(db, entry(1, 6, 120), NOW + 1)).toEqual({ ok: false, reason: "implausible" });
    expect(await submitEntry(db, entry(1, 5, 100 + 20 + 151), NOW + 1)).toEqual({ ok: false, reason: "implausible" });
    expect(sqlite.prepare("SELECT streak, earned, last_date FROM leaderboard_entries").all()).toEqual([{ streak: 4, earned: 80, last_date: YESTERDAY }]);
    expect(await submitEntry(db, entry(1, 5, 120), NOW + 2)).toMatchObject({ ok: true });
  });

  it("allows the days a learner studied without reporting, and keeps newer numbers over an offline device's", async () => {
    await submitEntry(db, entry(1, 2, 40, { lastDate: "2026-11-15" }), NOW);
    expect(await submitEntry(db, entry(1, 7, 140), NOW + 1)).toMatchObject({ ok: true });
    await submitEntry(db, entry(1, 3, 60, { lastDate: "2026-11-16", name: "From old phone" }), NOW + 2);
    expect(sqlite.prepare("SELECT name, streak, last_date FROM leaderboard_entries").all()).toEqual([{ name: "From old phone", streak: 7, last_date: TODAY }]);
  });

  it("refuses to change an entry without its secret, and changes nothing (007 AC-014)", async () => {
    await submitEntry(db, entry(1, 3), NOW);
    const result = await submitEntry(db, entry(1, 4, 80, { tokenHash: "someone-else", name: "Hacked" }), NOW + 1);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(sqlite.prepare("SELECT name, streak FROM leaderboard_entries").all()).toEqual([{ name: "Learner 1", streak: 3 }]);
  });

  it("is 1st of 1 when alone", async () => {
    expect(await submitEntry(db, entry(1, 1), NOW)).toMatchObject({ ok: true, rank: 1, previousRank: 1, total: 1 });
  });

  it("deletes rows untouched for 90 days, a few per request", async () => {
    for (let n = 1; n <= CLEANUP_LIMIT + 5; n++) await submitEntry(db, entry(n, 1), NOW - RETENTION_MS - DAY);
    await submitEntry(db, entry(999, 1), NOW);
    const left = sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get() as { n: number };
    expect(left.n).toBe(5 + 1);
  });
});

describe("removeEntry (AC-010, AC-014)", () => {
  it("deletes with the right secret", async () => {
    await submitEntry(db, entry(1, 1), NOW);
    expect(await removeEntry(db, id(1), "hash-1")).toEqual({ ok: true });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get()).toEqual({ n: 0 });
  });

  it("refuses another secret and keeps the entry", async () => {
    await submitEntry(db, entry(1, 1), NOW);
    expect(await removeEntry(db, id(1), "nope")).toEqual({ ok: false, reason: "forbidden" });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get()).toEqual({ n: 1 });
  });

  it("is fine when there is no entry", async () => {
    expect(await removeEntry(db, id(7), "hash-7")).toEqual({ ok: true });
  });
});

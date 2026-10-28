// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { CLEANUP_LIMIT, RETENTION_MS, removeEntry, submitEntry, type EntryInput } from "./leaderboard.service";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-28T10:00:00Z");
const WEEK = "2026-W44";
let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const entry = (n: number, points: number, extra: Partial<EntryInput> = {}): EntryInput => ({
  id: id(n),
  tokenHash: `hash-${n}`,
  name: `Learner ${n}`,
  week: WEEK,
  points,
  previousPoints: 0,
  ...extra,
});

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
});

describe("submitEntry", () => {
  it("ranks the learner, before and after this lesson, with up to 3 rows above and below (AC-001, AC-002)", async () => {
    // Eight learners with 80, 70, … 10 points, each reaching them in order.
    for (let n = 1; n <= 8; n++) await submitEntry(db, entry(n, 90 - n * 10), NOW + n);
    // Learner 9 had 20 (7th of 9) and now has 45: 5th.
    const result = await submitEntry(db, entry(9, 45, { previousPoints: 20 }), NOW + 100);
    expect(result).toMatchObject({ ok: true, rank: 5, previousRank: 7, total: 9 });
    if (!result.ok) return;
    expect(result.rows.map((row) => [row.position, row.name, row.points, row.me])).toEqual([
      [2, "Learner 2", 70, false],
      [3, "Learner 3", 60, false],
      [4, "Learner 4", 50, false],
      [5, "Learner 9", 45, true],
      [6, "Learner 5", 40, false],
      [7, "Learner 6", 30, false],
      [8, "Learner 7", 20, false],
    ]);
  });

  it("only ranks learners who posted this week (AC-005)", async () => {
    await submitEntry(db, entry(1, 200, { week: "2026-W43" }), NOW);
    const result = await submitEntry(db, entry(2, 10), NOW);
    expect(result).toMatchObject({ ok: true, rank: 1, total: 1 });
  });

  it("puts whoever reached a score first higher on a tie, and a rename keeps that", async () => {
    await submitEntry(db, entry(1, 30), NOW);
    await submitEntry(db, entry(2, 30), NOW + 1);
    const renamed = await submitEntry(db, entry(1, 30, { name: "New name" }), NOW + 2);
    expect(renamed).toMatchObject({ ok: true, rank: 1 });
    expect(await submitEntry(db, entry(2, 30), NOW + 3)).toMatchObject({ ok: true, rank: 2 });
  });

  it("refuses to change an entry without its secret, and changes nothing (AC-014)", async () => {
    await submitEntry(db, entry(1, 30), NOW);
    const result = await submitEntry(db, entry(1, 300, { tokenHash: "someone-else", name: "Hacked" }), NOW + 1);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(sqlite.prepare("SELECT name, points FROM leaderboard_entries").all()).toEqual([{ name: "Learner 1", points: 30 }]);
  });

  it("is 1st of 1 when alone", async () => {
    expect(await submitEntry(db, entry(1, 10), NOW)).toMatchObject({ ok: true, rank: 1, previousRank: 1, total: 1 });
  });

  it("deletes rows untouched for 90 days, a few per request", async () => {
    for (let n = 1; n <= CLEANUP_LIMIT + 5; n++) await submitEntry(db, entry(n, 10), NOW - RETENTION_MS - DAY);
    await submitEntry(db, entry(999, 10), NOW);
    const left = sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get() as { n: number };
    expect(left.n).toBe(5 + 1);
  });
});

describe("removeEntry (AC-010, AC-014)", () => {
  it("deletes with the right secret", async () => {
    await submitEntry(db, entry(1, 10), NOW);
    expect(await removeEntry(db, id(1), "hash-1")).toEqual({ ok: true });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get()).toEqual({ n: 0 });
  });

  it("refuses another secret and keeps the entry", async () => {
    await submitEntry(db, entry(1, 10), NOW);
    expect(await removeEntry(db, id(1), "nope")).toEqual({ ok: false, reason: "forbidden" });
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM leaderboard_entries").get()).toEqual({ n: 1 });
  });

  it("is fine when there is no entry", async () => {
    expect(await removeEntry(db, id(7), "hash-7")).toEqual({ ok: true });
  });
});

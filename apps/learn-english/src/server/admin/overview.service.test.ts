// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { getOverview, vnDay, vnDayStart } from "./overview.service";

// 2026-11-09 10:00 in Vietnam.
const NOW = Date.parse("2026-11-09T03:00:00Z");
const DAY = 86_400_000;
let handle: ReturnType<typeof sqliteDb>;

function addUser(id: string, createdAt: number, lastSeenAt: number | null, optOut = false) {
  handle.sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at, stats_opt_out) VALUES ('${id}', '${id}', '${id}@example.com', ${createdAt}, ${createdAt}, ${optOut ? 1 : 0})`);
  if (lastSeenAt !== null) handle.sqlite.exec(`INSERT INTO presence (user_id, last_seen_at, left) VALUES ('${id}', ${lastSeenAt}, 0)`);
}

beforeEach(() => {
  handle = sqliteDb();
  addUser("new-today", NOW - 3_600_000, NOW - 60_000);
  addUser("last-week", NOW - 5 * DAY, NOW - 2 * DAY);
  addUser("old", NOW - 90 * DAY, NOW - 20 * DAY);
  addUser("never-seen", NOW - 40 * DAY, null);
  addUser("opted-out", NOW - 60_000, NOW - 60_000, true);
  handle.sqlite.exec(`INSERT INTO claims (id, sentence_id, answer, device_hash, day, created_at, status) VALUES ('c1', 'sentence:a', 'x', 'd', '2026-11-09', ${NOW}, 'pending'), ('c2', 'sentence:a', 'y', 'd', '2026-11-09', ${NOW}, 'approved')`);
  handle.sqlite.exec(`INSERT INTO stats_devices (day, device_hash) VALUES ('2026-11-09', 'a'), ('2026-11-09', 'b'), ('2026-11-05', 'c'), ('2026-10-01', 'd')`);
  handle.sqlite.exec(`INSERT INTO stats_daily (day, metric, key, count) VALUES
    ('2026-11-09', 'lesson_completed', '', 3), ('2026-11-06', 'lesson_completed', '', 2), ('2026-11-09', 'placement_done', '', 1),
    ('2026-11-09', 'exercise', 'mcq', 10), ('2026-11-08', 'exercise', 'mcq', 5), ('2026-11-09', 'exercise', 'recall', 7),
    ('2026-11-09', 'word_wrong', 'word:cat', 4), ('2026-11-07', 'word_wrong', 'word:dog', 9)`);
});

describe("admin overview (feature 038)", () => {
  it("counts Vietnam days", () => {
    expect(vnDay(NOW)).toBe("2026-11-09");
    expect(vnDay(vnDayStart(NOW))).toBe("2026-11-09");
    expect(vnDayStart(NOW)).toBe(Date.parse("2026-11-08T17:00:00Z"));
    // 06:30 Vietnam is still the 9th even though UTC is the 8th.
    expect(vnDay(Date.parse("2026-11-08T23:30:00Z"))).toBe("2026-11-09");
  });

  it("counts accounts: the total includes everyone, created and active leave out opted-out learners (AC-006, AC-008)", async () => {
    const overview = await getOverview(handle.db, "today", NOW);
    expect(overview.accounts).toEqual({ total: 5, created: { today: 1, week: 2, month: 2 }, active: { today: 1, week: 2, month: 3 } });
    expect(overview.pendingClaims).toBe(1);
  });

  it("sums the anonymous stats for the chosen range (AC-007)", async () => {
    const today = await getOverview(handle.db, "today", NOW);
    expect(today).toMatchObject({ from: "2026-11-09", to: "2026-11-09", lessons: 3, placements: 1 });
    expect(today.devices).toEqual([{ day: "2026-11-09", devices: 2 }]);
    expect(today.exercises).toEqual([{ kind: "mcq", answered: 10 }, { kind: "recall", answered: 7 }]);
    expect(today.wrongWords).toEqual([{ wordId: "word:cat", wrong: 4 }]);

    const week = await getOverview(handle.db, "week", NOW);
    expect(week).toMatchObject({ from: "2026-11-03", lessons: 5 });
    expect(week.devices.map((d) => d.day)).toEqual(["2026-11-05", "2026-11-09"]);
    expect(week.exercises[0]).toEqual({ kind: "mcq", answered: 15 });
    expect(week.wrongWords[0]).toEqual({ wordId: "word:dog", wrong: 9 });
  });

  it("counts Arena matches once each", async () => {
    handle.sqlite.exec(`INSERT INTO arena_matches (match_id, user_id, opponent_id, won, forfeit, rounds_won, opponent_rounds_won, rounds, mode, level, best_of, ended_at) VALUES
      ('m1', 'old', 'last-week', 1, 0, 1, 0, '[]', 'listen', 'A1', 1, ${NOW - 60_000}), ('m1', 'last-week', 'old', 0, 0, 0, 1, '[]', 'listen', 'A1', 1, ${NOW - 60_000}),
      ('m2', 'old', 'last-week', 1, 0, 1, 0, '[]', 'listen', 'A1', 1, ${NOW - 10 * DAY})`);
    expect((await getOverview(handle.db, "today", NOW)).arenaMatches).toBe(1);
    expect((await getOverview(handle.db, "month", NOW)).arenaMatches).toBe(2);
  });
});

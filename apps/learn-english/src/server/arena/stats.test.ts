// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { getStats, NO_STATS, recordResult } from "./stats";

const NOW = Date.parse("2026-11-04T10:00:00Z");

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"]]) {
    sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', ${NOW}, ${NOW})`);
  }
});

describe("arena stats (AC-029, AC-030)", () => {
  it("are all zero before a learner's first duel", async () => {
    expect(await getStats(db, "minh")).toEqual(NO_STATS);
  });

  it("give the winner a win and the loser a loss", async () => {
    await recordResult(db, "minh", "lan", NOW);
    expect(await getStats(db, "minh")).toEqual({ wins: 1, losses: 0, streak: 1, bestStreak: 1 });
    expect(await getStats(db, "lan")).toEqual({ wins: 0, losses: 1, streak: 0, bestStreak: 0 });
  });

  it("grow a run of wins, end it on a loss and keep the best", async () => {
    await recordResult(db, "minh", "lan", NOW);
    await recordResult(db, "minh", "lan", NOW + 1);
    await recordResult(db, "minh", "lan", NOW + 2);
    expect(await getStats(db, "minh")).toEqual({ wins: 3, losses: 0, streak: 3, bestStreak: 3 });

    await recordResult(db, "lan", "minh", NOW + 3);
    expect(await getStats(db, "minh")).toEqual({ wins: 3, losses: 1, streak: 0, bestStreak: 3 });
    expect(await getStats(db, "lan")).toEqual({ wins: 1, losses: 3, streak: 1, bestStreak: 1 });

    await recordResult(db, "minh", "lan", NOW + 4);
    expect(await getStats(db, "minh")).toEqual({ wins: 4, losses: 1, streak: 1, bestStreak: 3 });
  });

  it("go with the account when it is deleted", async () => {
    await recordResult(db, "minh", "lan", NOW);
    sqlite.exec("DELETE FROM user WHERE id = 'minh'");
    expect(sqlite.prepare("SELECT user_id FROM arena_stats ORDER BY user_id").all()).toEqual([{ user_id: "lan" }]);
  });
});

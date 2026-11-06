// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { historyEntries } from "@/learning/arena/history";
import { listHistory, recordMatch } from "@/server/arena/history";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { deleteAccount } from "./account.service";

const NOW = Date.parse("2026-11-05T13:14:00Z");

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"]]) {
    sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', ${NOW}, ${NOW})`);
  }
});

describe("deleteAccount", () => {
  it("deletes the account and says whether there was one", async () => {
    expect(await deleteAccount(db, "lan")).toBe(true);
    expect(await deleteAccount(db, "lan")).toBe(false);
    expect(sqlite.prepare("SELECT id FROM user").all()).toEqual([{ id: "minh" }]);
  });

  it("keeps the other learner's match but drops the deleted player's name and picture (feature 025)", async () => {
    const match = {
      endedAt: NOW,
      reason: "won" as const,
      settings: { mode: "mixed" as const, level: "A1" as const, rounds: 1 as const, seconds: 15 as const },
      winnerId: "minh",
      players: [
        { id: "minh", name: "Minh Anh", image: null, roundsWon: 1 },
        { id: "lan", name: "Lan", image: "https://example.com/lan.png", roundsWon: 0 },
      ],
      rounds: [{ round: 1, scores: { minh: 7, lan: 5 }, winnerId: "minh" }],
    };
    await recordMatch(db, historyEntries(match, "m1"));

    await deleteAccount(db, "lan");

    expect((await listHistory(db, "minh")).matches[0]).toMatchObject({ id: "m1", won: true, opponent: null });
    expect(sqlite.prepare("SELECT user_id, opponent_id, opponent_name, opponent_image FROM arena_matches").all()).toEqual([
      { user_id: "minh", opponent_id: null, opponent_name: null, opponent_image: null },
    ]);
  });
});

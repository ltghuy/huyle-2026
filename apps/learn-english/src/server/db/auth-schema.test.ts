// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";

// Migration 0005 (feature 022): deleting a user removes everything that belongs to them.
describe("auth tables", () => {
  const NOW = Date.parse("2026-11-03T10:00:00Z");

  function seed() {
    const { sqlite } = sqliteDb();
    sqlite.exec(`
      INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u1', 'Minh Anh', 'minh@example.com', ${NOW}, ${NOW});
      INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u2', 'Lan', 'lan@example.com', ${NOW}, ${NOW});
      INSERT INTO session (id, user_id, token, expires_at, created_at, updated_at) VALUES ('s1', 'u1', 't1', ${NOW}, ${NOW}, ${NOW});
      INSERT INTO account (id, user_id, account_id, provider_id, created_at, updated_at) VALUES ('a1', 'u1', 'g-1', 'google', ${NOW}, ${NOW});
      INSERT INTO account_progress (user_id, data, rev, size, created_at, updated_at) VALUES ('u1', x'00', 1, 1, ${NOW}, ${NOW});
      INSERT INTO account_activity (user_id, week, device_hash) VALUES ('u1', '2026-W45', 'd1');
      INSERT INTO account_activity (user_id, week, device_hash) VALUES ('u2', '2026-W45', 'd2');
      INSERT INTO leaderboard_entries (id, token_hash, name, reached_at, updated_at, user_id) VALUES ('b1', 'h', 'Minh Anh', ${NOW}, ${NOW}, 'u1');
      INSERT INTO leaderboard_entries (id, token_hash, name, reached_at, updated_at) VALUES ('b0', 'h0', 'Old entry', ${NOW}, ${NOW});
    `);
    return sqlite;
  }

  const count = (sqlite: ReturnType<typeof seed>, table: string, where = "user_id = 'u1'") =>
    (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number }).n;

  it("cascades a user's deletion to sessions, accounts, progress, activity and the board entry", () => {
    const sqlite = seed();
    sqlite.exec("DELETE FROM user WHERE id = 'u1'");
    for (const table of ["session", "account", "account_progress", "account_activity", "leaderboard_entries"]) {
      expect(count(sqlite, table), table).toBe(0);
    }
    expect(count(sqlite, "account_activity", "user_id = 'u2'")).toBe(1);
    expect(count(sqlite, "leaderboard_entries", "id = 'b0'")).toBe(1);
  });

  it("refuses progress for an account that doesn't exist", () => {
    const sqlite = seed();
    expect(() =>
      sqlite.exec(`INSERT INTO account_progress (user_id, data, rev, size, created_at, updated_at) VALUES ('nobody', x'00', 1, 1, ${NOW}, ${NOW})`),
    ).toThrow(/FOREIGN KEY/);
  });

  it("keeps one activity row per account, week and device", () => {
    const sqlite = seed();
    sqlite.exec("INSERT INTO account_activity (user_id, week, device_hash) VALUES ('u1', '2026-W45', 'd1') ON CONFLICT DO NOTHING");
    expect(count(sqlite, "account_activity")).toBe(1);
  });
});

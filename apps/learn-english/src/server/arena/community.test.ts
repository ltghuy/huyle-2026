// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { CommunityListing } from "@/learning/arena/community";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { COMMUNITY_LIMIT, COMMUNITY_TTL_MS, listCommunity, removeListing, writeListing } from "./community";

const NOW = Date.parse("2026-11-12T13:00:00Z");

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"]]) {
    sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', ${NOW}, ${NOW})`);
  }
});

function duel(code: string, overrides: Partial<Extract<CommunityListing, { kind: "duel" }>> = {}): CommunityListing {
  return {
    kind: "duel",
    code,
    level: "A1",
    settings: { mode: "mixed", level: "A1", rounds: 3, seconds: 15 },
    host: { id: "minh", name: "Minh Anh", image: "https://example.test/minh.png" },
    taken: 1,
    seats: 2,
    ...overrides,
  };
}

const team = (code: string): CommunityListing => ({
  kind: "team",
  code,
  level: "A2",
  settings: { mode: "listen", level: "A2", rounds: 1, seconds: 25, size: 6, minutes: 10 },
  host: { id: "lan", name: "Lan", image: null },
  taken: 3,
  seats: 6,
});

describe("Cộng đồng list (041)", () => {
  it("lists written rooms newest first, with every detail a row shows (AC-007)", async () => {
    await writeListing(db, duel("AAAAAA"), NOW - 2_000);
    await writeListing(db, team("BBBBBB"), NOW - 1_000);
    expect(await listCommunity(db, {}, NOW)).toEqual([
      {
        kind: "team",
        code: "BBBBBB",
        settings: { mode: "listen", level: "A2", rounds: 1, seconds: 25, size: 6, minutes: 10 },
        host: { id: "lan", name: "Lan", image: null },
        taken: 3,
        seats: 6,
        updatedAt: NOW - 1_000,
      },
      {
        kind: "duel",
        code: "AAAAAA",
        settings: { mode: "mixed", level: "A1", rounds: 3, seconds: 15 },
        host: { id: "minh", name: "Minh Anh", image: "https://example.test/minh.png" },
        taken: 1,
        seats: 2,
        updatedAt: NOW - 2_000,
      },
    ]);
  });

  it("filters by kind and level (AC-008)", async () => {
    await writeListing(db, duel("AAAAAA"), NOW);
    await writeListing(db, duel("CCCCCC", { level: "B1", settings: { mode: "listen", level: "B1", rounds: 1, seconds: 15 } }), NOW);
    await writeListing(db, team("BBBBBB"), NOW);
    const codes = async (query: Parameters<typeof listCommunity>[1]) => (await listCommunity(db, query, NOW)).map((room) => room.code).sort();
    expect(await codes({ kind: "duel" })).toEqual(["AAAAAA", "CCCCCC"]);
    expect(await codes({ kind: "team" })).toEqual(["BBBBBB"]);
    expect(await codes({ level: "B1" })).toEqual(["CCCCCC"]);
    expect(await codes({ kind: "team", level: "A1" })).toEqual([]);
  });

  it("replaces a room's row on a new write and removes it (AC-003 to AC-005)", async () => {
    await writeListing(db, duel("AAAAAA"), NOW - 1_000);
    await writeListing(db, duel("AAAAAA", { level: "B2", settings: { mode: "write", level: "B2", rounds: 1, seconds: 45 } }), NOW);
    expect(await listCommunity(db, {}, NOW)).toMatchObject([{ code: "AAAAAA", settings: { level: "B2", mode: "write" }, updatedAt: NOW }]);
    await removeListing(db, "AAAAAA");
    expect(await listCommunity(db, {}, NOW)).toEqual([]);
  });

  it("skips rows older than 2 hours and prunes them on the next write (edge case)", async () => {
    await writeListing(db, duel("OLDOLD"), NOW - COMMUNITY_TTL_MS - 1);
    expect(await listCommunity(db, {}, NOW)).toEqual([]);
    await writeListing(db, duel("AAAAAA"), NOW);
    expect(sqlite.prepare("SELECT code FROM arena_community").all()).toEqual([{ code: "AAAAAA" }]);
  });

  it("shows at most 50 rooms", async () => {
    for (let i = 0; i < COMMUNITY_LIMIT + 3; i++) await writeListing(db, duel(`R${String(i).padStart(5, "0")}`), NOW - i);
    const rooms = await listCommunity(db, {}, NOW);
    expect(rooms).toHaveLength(COMMUNITY_LIMIT);
    expect(rooms[0].code).toBe("R00000");
  });

  it("goes with the host's account (edge case)", async () => {
    await writeListing(db, duel("AAAAAA"), NOW);
    sqlite.exec("DELETE FROM user WHERE id = 'minh'");
    expect(await listCommunity(db, {}, NOW)).toEqual([]);
  });
});

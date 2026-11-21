// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { socialDb } from "@/test-utils/social-db";
import { respond, sendRequest } from "@/server/social/friends.service";
import { leave } from "@/server/social/presence.service";
import { pulse } from "@/server/social/pulse.service";
import { ONLINE_WINDOW_MS } from "@/server/social/social.schema";
import type { RoomStatus } from "./room";
import { listOnline, mayListOnline, ONLINE_LIMIT } from "./online.service";

const NOW = Date.parse("2026-11-21T10:00:00Z");
let handle: ReturnType<typeof socialDb>;
const db = () => handle.db;

beforeEach(() => {
  handle = socialDb(NOW);
});

describe("listOnline (feature 045)", () => {
  it("lists everyone else online, newest first, marking the host's friends (AC-002, AC-005, AC-007)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    await respond(db(), "lan", "minh", true, NOW);
    await pulse(db(), "minh", NOW);
    await pulse(db(), "lan", NOW - 60_000);
    await pulse(db(), "khoa", NOW - 10_000);
    expect(await listOnline(db(), "minh", NOW)).toEqual([
      { id: "khoa", name: "Khoa", image: "https://example.com/khoa.png", isFriend: false, lastSeenAt: NOW - 10_000 },
      { id: "lan", name: "Lan", image: "https://example.com/lan.png", isFriend: true, lastSeenAt: NOW - 60_000 },
    ]);
  });

  it("leaves out learners seen too long ago and those whose last tab said goodbye", async () => {
    await pulse(db(), "lan", NOW - ONLINE_WINDOW_MS - 1);
    await pulse(db(), "khoa", NOW);
    await leave(db(), "khoa", NOW);
    expect(await listOnline(db(), "minh", NOW)).toEqual([]);
  });

  it("shows at most the limit", async () => {
    for (let i = 0; i < ONLINE_LIMIT + 2; i++) {
      handle.sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u${i}', 'U${i}', 'u${i}@example.com', ${NOW}, ${NOW})`);
      await pulse(db(), `u${i}`, NOW - i);
    }
    const learners = await listOnline(db(), "minh", NOW);
    expect(learners).toHaveLength(ONLINE_LIMIT);
    expect(learners[0].id).toBe("u0");
  });
});

describe("mayListOnline", () => {
  const LOBBY: RoomStatus = { phase: "lobby", creatorId: "minh", playerIds: ["minh"], spectatorIds: [], settings: { mode: "mixed", level: "A1", rounds: 1, seconds: 15 }, fromCommunity: true };

  it("is only for the host of a waiting room from Cộng đồng", () => {
    expect(mayListOnline(LOBBY, "minh")).toBe(true);
    expect(mayListOnline(LOBBY, "lan")).toBe(false);
    expect(mayListOnline({ ...LOBBY, fromCommunity: false }, "minh")).toBe(false);
    expect(mayListOnline({ ...LOBBY, fromCommunity: undefined }, "minh")).toBe(false);
    expect(mayListOnline({ ...LOBBY, phase: "question" }, "minh")).toBe(false);
    expect(mayListOnline(null, "minh")).toBe(false);
  });
});

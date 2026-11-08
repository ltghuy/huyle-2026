// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { socialDb } from "@/test-utils/social-db";
import { isOnline, leave, touchPresence } from "./presence.service";
import { ONLINE_WINDOW_MS } from "./social.schema";

const NOW = Date.parse("2026-11-08T10:00:00Z");
let handle: ReturnType<typeof socialDb>;
const row = () => handle.sqlite.prepare("SELECT last_seen_at, left FROM presence WHERE user_id = 'minh'").get() as { last_seen_at: number; left: number } | undefined;
const changes = () => (handle.sqlite.prepare("SELECT changes() AS n").get() as { n: number }).n;

beforeEach(() => {
  handle = socialDb(NOW);
});

describe("presence (feature 031)", () => {
  it("inserts on the first pulse", async () => {
    await touchPresence(handle.db, "minh", NOW);
    expect(row()).toEqual({ last_seen_at: NOW, left: 0 });
  });

  it("writes nothing while the stored time is fresh, so tabs share one write", async () => {
    await touchPresence(handle.db, "minh", NOW);
    await touchPresence(handle.db, "minh", NOW + 30_000);
    expect(changes()).toBe(0);
    expect(row()?.last_seen_at).toBe(NOW);
  });

  it("rewrites a stale time, and right away after a goodbye", async () => {
    await touchPresence(handle.db, "minh", NOW);
    await touchPresence(handle.db, "minh", NOW + 50_000);
    expect(row()?.last_seen_at).toBe(NOW + 50_000);
    await leave(handle.db, "minh", NOW + 55_000);
    expect(row()).toEqual({ last_seen_at: NOW + 55_000, left: 1 });
    await touchPresence(handle.db, "minh", NOW + 56_000);
    expect(row()).toEqual({ last_seen_at: NOW + 56_000, left: 0 });
  });

  it("is online inside the window and not after it, after a goodbye, or when never seen", () => {
    expect(isOnline({ lastSeenAt: NOW - ONLINE_WINDOW_MS + 1, left: false }, NOW)).toBe(true);
    expect(isOnline({ lastSeenAt: NOW - ONLINE_WINDOW_MS, left: false }, NOW)).toBe(false);
    expect(isOnline({ lastSeenAt: NOW, left: true }, NOW)).toBe(false);
    expect(isOnline({ lastSeenAt: null, left: null }, NOW)).toBe(false);
  });
});

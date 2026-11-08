// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { socialDb } from "@/test-utils/social-db";
import { listNotifications, markAllRead } from "./notifications.service";
import { pulse } from "./pulse.service";
import { NOTIFICATION_LIMIT, NOTIFICATION_MAX_AGE_MS } from "./social.schema";

const NOW = Date.parse("2026-11-08T10:00:00Z");
let handle: ReturnType<typeof socialDb>;

function add(userId: string, actorId: string, createdAt: number, kind = "friend_accepted", id = crypto.randomUUID()) {
  handle.sqlite.exec(`INSERT INTO notifications (id, user_id, kind, actor_id, created_at) VALUES ('${id}', '${userId}', '${kind}', '${actorId}', ${createdAt})`);
}

beforeEach(() => {
  handle = socialDb(NOW);
});

describe("notifications (feature 031)", () => {
  it("lists only the learner's own, newest first (AC-024, AC-031)", async () => {
    add("lan", "minh", NOW - 2000, "friend_accepted", "a");
    add("lan", "khoa", NOW - 1000, "friend_added", "b");
    add("khoa", "minh", NOW, "friend_accepted", "c");
    const { items } = await listNotifications(handle.db, "lan", NOW);
    expect(items.map((item) => item.id)).toEqual(["b", "a"]);
    expect(items[0]).toMatchObject({ kind: "friend_added", actor: { id: "khoa", name: "Khoa" }, read: false, pending: false });
  });

  it("keeps the 50 newest and deletes anything older than 30 days", async () => {
    // Only one row per kind and actor in real use; the limit is checked with raw rows here.
    handle.sqlite.exec("DROP INDEX notifications_user_kind_actor");
    for (let i = 0; i < NOTIFICATION_LIMIT + 5; i++) add("lan", "minh", NOW - i, "friend_accepted", `n${i}`);
    add("lan", "khoa", NOW - NOTIFICATION_MAX_AGE_MS - 1, "friend_added", "old");
    const { items } = await listNotifications(handle.db, "lan", NOW);
    expect(items).toHaveLength(NOTIFICATION_LIMIT);
    expect(handle.sqlite.prepare("SELECT id FROM notifications WHERE id = 'old'").get()).toBeUndefined();
  });

  it("counts unread for the bell and marks all read on open (AC-023, AC-024)", async () => {
    add("lan", "minh", NOW - 1000, "friend_accepted", "a");
    add("lan", "khoa", NOW - 500, "friend_added", "b");
    expect((await pulse(handle.db, "lan", NOW)).unread).toBe(2);
    await markAllRead(handle.db, "lan", NOW);
    expect((await pulse(handle.db, "lan", NOW)).unread).toBe(0);
    expect((await listNotifications(handle.db, "lan", NOW)).items.every((item) => item.read)).toBe(true);
  });
});

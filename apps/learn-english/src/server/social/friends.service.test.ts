// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { socialDb } from "@/test-utils/social-db";
import { removeFriend, respond, sendRequest } from "./friends.service";
import { listNotifications } from "./notifications.service";
import { pulse } from "./pulse.service";
import { DECLINE_COOLDOWN_MS, MAX_PENDING } from "./social.schema";

const NOW = Date.parse("2026-11-08T10:00:00Z");
let handle: ReturnType<typeof socialDb>;
const db = () => handle.db;
const kinds = async (userId: string) => (await listNotifications(db(), userId, NOW)).items.map((item) => [item.kind, item.actor.id]);

beforeEach(() => {
  handle = socialDb(NOW);
});

describe("friend requests (feature 031)", () => {
  it("sends a request: the sender sees it as sent and the receiver gets a notification (AC-003, AC-004)", async () => {
    expect(await sendRequest(db(), "minh", "lan", NOW)).toEqual({ ok: true, state: "sent" });
    expect((await pulse(db(), "minh", NOW)).outgoing).toEqual(["lan"]);
    const lan = await pulse(db(), "lan", NOW);
    expect(lan.incoming).toEqual(["minh"]);
    expect(lan.unread).toBe(1);
    const [item] = (await listNotifications(db(), "lan", NOW)).items;
    expect(item).toMatchObject({ kind: "friend_request", actor: { id: "minh", name: "Minh Anh", image: "https://example.com/minh.png" }, createdAt: NOW, read: false, pending: true });
  });

  it("refuses yourself and unknown learners", async () => {
    expect(await sendRequest(db(), "minh", "minh", NOW)).toEqual({ ok: false, reason: "self" });
    expect(await sendRequest(db(), "minh", "ghost", NOW)).toEqual({ ok: false, reason: "notFound" });
  });

  it("does not duplicate a request sent twice", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    await sendRequest(db(), "minh", "lan", NOW + 1000);
    expect(await kinds("lan")).toEqual([["friend_request", "minh"]]);
  });

  it("accepting makes both friends, turns the notice and tells the sender (AC-005, AC-028)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    expect(await respond(db(), "lan", "minh", true, NOW + 1000)).toEqual({ ok: true, state: "friends" });
    expect((await pulse(db(), "lan", NOW + 1000)).friends.map((f) => f.id)).toEqual(["minh"]);
    const minh = await pulse(db(), "minh", NOW + 1000);
    expect(minh.friends.map((f) => f.id)).toEqual(["lan"]);
    expect(minh.outgoing).toEqual([]);
    expect(await kinds("lan")).toEqual([["friend_added", "minh"]]);
    expect(await kinds("minh")).toEqual([["friend_accepted", "lan"]]);
  });

  it("a request back to someone who already asked makes them friends at once (AC-008)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    expect(await sendRequest(db(), "lan", "minh", NOW + 1000)).toEqual({ ok: true, state: "friends" });
    expect((await pulse(db(), "minh", NOW + 1000)).friends.map((f) => f.id)).toEqual(["lan"]);
    expect(await sendRequest(db(), "lan", "minh", NOW + 2000)).toEqual({ ok: true, state: "friends" });
  });

  it("declining tells nobody and blocks a new request for 7 days (AC-006)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    expect(await respond(db(), "lan", "minh", false, NOW)).toEqual({ ok: true, state: "declined" });
    expect(await kinds("lan")).toEqual([]);
    expect(await kinds("minh")).toEqual([]);
    expect(await sendRequest(db(), "minh", "lan", NOW + 1000)).toEqual({ ok: true, state: "sent" });
    expect((await pulse(db(), "minh", NOW + 1000)).outgoing).toEqual(["lan"]);
    expect(await kinds("lan")).toEqual([]);
    const later = NOW + DECLINE_COOLDOWN_MS + 1;
    expect((await pulse(db(), "minh", later)).outgoing).toEqual([]);
    expect(await sendRequest(db(), "minh", "lan", later)).toEqual({ ok: true, state: "sent" });
    expect((await listNotifications(db(), "lan", later)).items).toHaveLength(1);
  });

  it("deletes a declined request once its 7 days are over (privacy page)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    await respond(db(), "lan", "minh", false, NOW);
    await pulse(db(), "lan", NOW + DECLINE_COOLDOWN_MS - 1);
    expect(handle.sqlite.prepare("SELECT count(*) AS n FROM friend_requests").get()).toEqual({ n: 1 });
    await pulse(db(), "lan", NOW + DECLINE_COOLDOWN_MS + 1);
    expect(handle.sqlite.prepare("SELECT count(*) AS n FROM friend_requests").get()).toEqual({ n: 0 });
  });

  it("answers gone when the request no longer waits (AC-029)", async () => {
    expect(await respond(db(), "lan", "minh", true, NOW)).toEqual({ ok: false, reason: "gone" });
    await sendRequest(db(), "minh", "lan", NOW);
    await respond(db(), "lan", "minh", true, NOW);
    // Accepted again from another device: same outcome.
    expect(await respond(db(), "lan", "minh", true, NOW)).toEqual({ ok: true, state: "friends" });
    expect(await respond(db(), "lan", "minh", false, NOW)).toEqual({ ok: false, reason: "gone" });
  });

  it("caps waiting requests at 20", async () => {
    for (let i = 0; i < MAX_PENDING; i++) {
      handle.sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u${i}', 'U${i}', 'u${i}@example.com', ${NOW}, ${NOW})`);
      await sendRequest(db(), "minh", `u${i}`, NOW);
    }
    expect(await sendRequest(db(), "minh", "lan", NOW)).toEqual({ ok: false, reason: "tooMany" });
  });

  it("removing ends it for both, and either can ask again right away (AC-020)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    await respond(db(), "lan", "minh", true, NOW);
    await removeFriend(db(), "lan", "minh");
    expect((await pulse(db(), "minh", NOW)).friends).toEqual([]);
    expect((await pulse(db(), "lan", NOW)).friends).toEqual([]);
    expect(await sendRequest(db(), "minh", "lan", NOW + 1000)).toEqual({ ok: true, state: "sent" });
  });

  it("deleting the sender's account removes the request and its notification (AC-029)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    handle.sqlite.exec("DELETE FROM user WHERE id = 'minh'");
    expect(await kinds("lan")).toEqual([]);
    expect((await pulse(db(), "lan", NOW)).incoming).toEqual([]);
  });
});

describe("pulse (feature 031)", () => {
  it("returns friends with presence and never other learners' (AC-012, AC-013)", async () => {
    await sendRequest(db(), "minh", "lan", NOW);
    await respond(db(), "lan", "minh", true, NOW);
    await pulse(db(), "lan", NOW - 60_000);
    const minh = await pulse(db(), "minh", NOW);
    expect(minh.friends).toEqual([{ id: "lan", name: "Lan", image: "https://example.com/lan.png", online: true, lastSeenAt: NOW - 60_000 }]);
    await pulse(db(), "khoa", NOW);
    expect(minh.friends.some((f) => f.id === "khoa")).toBe(false);
    const later = await pulse(db(), "minh", NOW + 200_000);
    expect(later.friends[0]).toMatchObject({ online: false, lastSeenAt: NOW - 60_000 });
  });
});

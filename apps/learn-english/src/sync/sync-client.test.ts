import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64ToBytes, buildSnapshot, bytesToBase64, decodeSnapshot, encodeSnapshot, type LearnerState } from "@/learning/snapshot";
import { addAttempt, getAllAttempts } from "@/storage/attempts";
import { addAttendance, getAllAttendance } from "@/storage/attendance";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import {
  deleteSyncedData,
  linkSync,
  previewSync,
  pushNow,
  startAutoSync,
  syncNow,
  SyncError,
  turnOnSync,
  unlinkSync,
} from "./sync-client";
import { fakeSyncServer } from "./test-server";

const NOW = Date.now();

async function seedLocal() {
  await saveProfile({ ...createDefaultProfile(NOW - 1000, () => "device-a"), level: "A2" });
  await putCards([makeCard("word:local", NOW, { last_review: NOW - 10, reps: 1 })]);
  await addAttempt(makeAttempt("local-1", "word:local", NOW - 10));
  await addAttendance({ date: "2026-10-20", points: 10, bonus: 0, at: NOW - 5000 });
}

/** Another device's progress, encoded the way the client uploads it. */
async function remotePayload(extra: Partial<LearnerState> = {}): Promise<string> {
  const state: LearnerState = {
    profile: { ...createDefaultProfile(NOW - 2000, () => "device-b"), level: "B1", fieldUpdatedAt: { level: NOW - 100 } },
    cards: [makeCard("word:remote", NOW, { last_review: NOW - 20, reps: 2 })],
    attempts: [makeAttempt("remote-1", "word:remote", NOW - 20)],
    lessons: [],
    attendance: [
      { date: "2026-10-20", points: 10, bonus: 0, at: NOW - 6000 },
      { date: "2026-10-21", points: 10, bonus: 0, at: NOW - 4000 },
    ],
    ...extra,
  };
  return bytesToBase64(await encodeSnapshot(buildSnapshot(state, NOW, "Asia/Ho_Chi_Minh")));
}

async function decodeRow(data: string) {
  const parsed = await decodeSnapshot(base64ToBytes(data));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.snapshot;
}

let server: ReturnType<typeof fakeSyncServer>;

beforeEach(async () => {
  await resetStorage();
  localStorage.clear();
  server = fakeSyncServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("turnOnSync", () => {
  it("uploads the current progress and stores the code on this device", async () => {
    await seedLocal();
    const code = await turnOnSync();

    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    const profile = await getProfile();
    expect(profile?.sync).toEqual({ code, rev: 1, lastSyncedAt: expect.any(Number), dirty: false });

    const snapshot = await decodeRow(server.row(code)!.data);
    expect(snapshot.data.attempts.map((a) => a.id)).toEqual(["local-1"]);
    expect(snapshot.data.meta).not.toHaveProperty("sync");
    expect(snapshot.data.meta).not.toHaveProperty("deviceId");
  });

  it("does not upload again when nothing changed, even after its own profile writes", async () => {
    await seedLocal();
    await turnOnSync();
    server.calls.length = 0;
    expect(await pushNow()).toBe(true);
    expect(server.calls.filter((c) => c.method === "PUT")).toHaveLength(0);
  });
});

describe("previewSync", () => {
  it("summarises the synced progress", async () => {
    server.rows.set("ABCD1234EFGH", { rev: 3, data: await remotePayload(), updatedAt: 1234 });
    const preview = await previewSync("abcd 1234 efgh");
    expect(preview).toEqual({
      code: "ABCD-1234-EFGH",
      rev: 3,
      updatedAt: 1234,
      summary: expect.objectContaining({ wordsLearned: 1, points: 20 }),
    });
  });

  it("rejects a malformed code without a request", async () => {
    await expect(previewSync("abc")).rejects.toMatchObject({ kind: "invalid-code" });
    expect(server.fetchMock).not.toHaveBeenCalled();
  });

  it("maps an unknown code, throttling and the network to Vietnamese errors", async () => {
    const notFound = await previewSync("ABCD-1234-EFGH").catch((e: unknown) => e);
    expect(notFound).toBeInstanceOf(SyncError);
    expect(notFound).toMatchObject({ kind: "not-found", message: "Không tìm thấy mã đồng bộ này. Bạn kiểm tra lại mã nhé." });

    server.fetchMock.mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await expect(previewSync("ABCD-1234-EFGH")).rejects.toMatchObject({ kind: "throttled", message: expect.stringMatching(/quá nhiều lần/) });

    server.offline = true;
    await expect(previewSync("ABCD-1234-EFGH")).rejects.toMatchObject({ kind: "offline", message: expect.stringMatching(/kiểm tra mạng/) });
  });
});

describe("linkSync", () => {
  it("merges the synced progress into this device, applies it and uploads the merge", async () => {
    await seedLocal();
    server.rows.set("ABCD1234EFGH", { rev: 3, data: await remotePayload(), updatedAt: 1 });

    await linkSync("ABCD-1234-EFGH");

    expect((await getAllAttempts()).map((a) => a.id).sort()).toEqual(["local-1", "remote-1"]);
    expect((await getAllCards()).map((c) => c.itemId)).toEqual(["word:local", "word:remote"]);
    // The first award for a day stands; no double points.
    expect(await getAllAttendance()).toEqual([
      { date: "2026-10-20", points: 10, bonus: 0, at: NOW - 6000 },
      { date: "2026-10-21", points: 10, bonus: 0, at: NOW - 4000 },
    ]);
    const profile = await getProfile();
    expect(profile?.level).toBe("B1"); // remote change is newer
    expect(profile?.deviceId).toBe("device-a");
    expect(profile?.sync).toMatchObject({ code: "ABCD-1234-EFGH", rev: 4, dirty: false });

    const uploaded = await decodeRow(server.row("ABCD-1234-EFGH")!.data);
    expect(uploaded.data.attempts.map((a) => a.id).sort()).toEqual(["local-1", "remote-1"]);
  });

  it("skips the upload when the merge adds nothing to the synced copy", async () => {
    await seedLocal();
    server.rows.set("ABCD1234EFGH", { rev: 3, data: await remotePayload(), updatedAt: 1 });
    await linkSync("ABCD-1234-EFGH");
    server.calls.length = 0;

    // Linking again: the copy already holds everything this device has.
    await linkSync("ABCD-1234-EFGH");
    expect(server.calls.map((c) => c.method)).toEqual(["GET"]);
    expect((await getProfile())?.sync).toMatchObject({ rev: 4, dirty: false });
  });
});

describe("pushNow", () => {
  it("uploads a local change with the stored rev", async () => {
    await seedLocal();
    const code = await turnOnSync();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    await pushNow();

    expect(server.row(code)!.rev).toBe(2);
    expect((await getProfile())?.sync).toMatchObject({ rev: 2, dirty: false });
    const uploaded = await decodeRow(server.row(code)!.data);
    expect(uploaded.data.attempts.map((a) => a.id)).toEqual(["local-1", "local-2"]);
  });

  it("on 409 fetches the newer copy, merges, applies it and retries", async () => {
    await seedLocal();
    const code = await turnOnSync();
    // Another device wrote rev 2 in the meantime.
    server.rows.set("TEST00000000", { rev: 2, data: await remotePayload(), updatedAt: 2 });
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    await pushNow();

    const methods = server.calls.map((c) => c.method);
    expect(methods.slice(-3)).toEqual(["PUT", "GET", "PUT"]);
    expect(server.row(code)!.rev).toBe(3);
    expect((await getAllAttempts()).map((a) => a.id).sort()).toEqual(["local-1", "local-2", "remote-1"]);
    const uploaded = await decodeRow(server.row(code)!.data);
    expect(uploaded.data.attempts.map((a) => a.id).sort()).toEqual(["local-1", "local-2", "remote-1"]);
    expect((await getProfile())?.sync).toMatchObject({ rev: 3, dirty: false });
  });

  it("stays dirty when offline and uploads once the network is back", async () => {
    await seedLocal();
    const code = await turnOnSync();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    server.offline = true;
    await expect(pushNow()).rejects.toMatchObject({ kind: "offline" });
    expect((await getProfile())?.sync).toMatchObject({ rev: 1, dirty: true });
    expect(server.row(code)!.rev).toBe(1);

    server.offline = false;
    await pushNow();
    expect((await getProfile())?.sync).toMatchObject({ rev: 2, dirty: false });
  });

  it("unlinks this device when the synced copy was deleted elsewhere", async () => {
    await seedLocal();
    const code = await turnOnSync();
    server.rows.delete("TEST00000000");
    await addAttempt(makeAttempt("local-2", "word:local", NOW));
    await expect(pushNow()).rejects.toMatchObject({ kind: "not-found" });
    expect((await getProfile())?.sync).toBeUndefined();
    expect(code).toBeTruthy();
  });
});

describe("syncNow", () => {
  it("pulls and applies newer progress when this device has no changes", async () => {
    await seedLocal();
    const code = await turnOnSync();
    server.rows.set("TEST00000000", { rev: 2, data: await remotePayload(), updatedAt: 2 });

    await syncNow();

    expect((await getAllAttempts()).map((a) => a.id).sort()).toEqual(["local-1", "remote-1"]);
    expect((await getProfile())?.sync?.code).toBe(code);
    expect((await getProfile())?.sync?.rev).toBeGreaterThanOrEqual(2);
  });

  it("only reads when nothing changed anywhere", async () => {
    await seedLocal();
    await turnOnSync();
    server.calls.length = 0;
    await syncNow();
    expect(server.calls.map((c) => c.method)).toEqual(["GET"]);
  });
});

describe("unlinkSync / deleteSyncedData", () => {
  it("unlinking keeps the synced copy on the server", async () => {
    await seedLocal();
    const code = await turnOnSync();
    await unlinkSync();
    expect((await getProfile())?.sync).toBeUndefined();
    expect(server.row(code)).toBeDefined();
  });

  it("deleting removes the synced copy, then unlinks", async () => {
    await seedLocal();
    const code = await turnOnSync();
    await deleteSyncedData();
    expect(server.row(code)).toBeUndefined();
    expect(server.calls.at(-1)).toMatchObject({ method: "DELETE", code });
    expect((await getProfile())?.sync).toBeUndefined();
  });

  it("deleting keeps the link when the server can't be reached", async () => {
    await seedLocal();
    await turnOnSync();
    server.offline = true;
    await expect(deleteSyncedData()).rejects.toMatchObject({ kind: "offline" });
    expect((await getProfile())?.sync).toBeDefined();
  });

  it("never sends the code in the URL", async () => {
    await seedLocal();
    await turnOnSync();
    await syncNow();
    for (const [url] of server.fetchMock.mock.calls) expect(String(url)).toBe("/api/sync");
  });
});

describe("startAutoSync", () => {
  it("uploads a change within a minute and doesn't loop on its own writes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await seedLocal();
    const code = await turnOnSync();
    const stop = startAutoSync();

    // The first run checks at once (a read, nothing to upload).
    await vi.advanceTimersByTimeAsync(10);
    await vi.waitFor(() => expect(server.calls.filter((c) => c.method === "GET")).toHaveLength(1));

    await addAttempt(makeAttempt("local-2", "word:local", NOW));
    await vi.advanceTimersByTimeAsync(61_000);
    await vi.waitFor(() => expect(server.row(code)!.rev).toBe(2));

    // Its own profile writes after the upload must not cause another one.
    const puts = () => server.calls.filter((c) => c.method === "PUT").length;
    const before = puts();
    await vi.advanceTimersByTimeAsync(130_000);
    expect(puts()).toBe(before);
    stop();
  });

  it("pushes with keepalive when the page is hidden", async () => {
    await seedLocal();
    const code = await turnOnSync();
    const stop = startAutoSync();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(server.row(code)!.rev).toBe(2));
    expect(server.calls.find((c) => c.method === "PUT")?.keepalive).toBe(true);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    stop();
  });
});

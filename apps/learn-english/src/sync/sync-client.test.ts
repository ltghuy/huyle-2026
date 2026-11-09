import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64ToBytes, buildSnapshot, bytesToBase64, decodeSnapshot, encodeSnapshot, type LearnerState } from "@/learning/snapshot";
import { addAttempt, getAllAttempts } from "@/storage/attempts";
import { addAttendance } from "@/storage/attendance";
import { putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import { linkAccount, pushNow, startAutoSync, syncNow } from "./sync-client";
import { fakeSyncServer } from "./test-server";

// The sync machinery that every server copy goes through (conflicts, offline, pulls, auto
// sync), run against the signed-in account, the only copy since sync codes went (feature 037).

const NOW = Date.now();
const ACCOUNT = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null };

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
    extraLessons: [],
    claims: [],
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

/** This device, linked to the account with its first copy uploaded (rev 1). */
async function linked() {
  await seedLocal();
  await linkAccount(ACCOUNT);
  server.calls.length = 0;
}

describe("pushNow", () => {
  it("uploads a local change with the stored rev", async () => {
    await linked();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    await pushNow();

    expect(server.account!.rev).toBe(2);
    expect((await getProfile())?.account).toMatchObject({ rev: 2, dirty: false });
    const uploaded = await decodeRow(server.account!.data);
    expect(uploaded.data.attempts.map((a) => a.id)).toEqual(["local-1", "local-2"]);
  });

  it("on 409 fetches the newer copy, merges, applies it and retries", async () => {
    await linked();
    // Another device wrote rev 2 in the meantime.
    server.account = { rev: 2, data: await remotePayload(), updatedAt: 2 };
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    await pushNow();

    expect(server.calls.map((c) => c.method)).toEqual(["PUT", "GET", "PUT"]);
    expect(server.account!.rev).toBe(3);
    expect((await getAllAttempts()).map((a) => a.id).sort()).toEqual(["local-1", "local-2", "remote-1"]);
    const uploaded = await decodeRow(server.account!.data);
    expect(uploaded.data.attempts.map((a) => a.id).sort()).toEqual(["local-1", "local-2", "remote-1"]);
    expect((await getProfile())?.account).toMatchObject({ rev: 3, dirty: false });
  });

  it("stays dirty when offline and uploads once the network is back", async () => {
    await linked();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    server.offline = true;
    await expect(pushNow()).rejects.toMatchObject({ kind: "offline" });
    expect((await getProfile())?.account).toMatchObject({ rev: 1, dirty: true });
    expect(server.account!.rev).toBe(1);

    server.offline = false;
    await pushNow();
    expect((await getProfile())?.account).toMatchObject({ rev: 2, dirty: false });
  });

  it("does nothing on a device with no account", async () => {
    await seedLocal();
    expect(await pushNow()).toBe(false);
    expect(server.calls).toEqual([]);
  });
});

describe("syncNow", () => {
  it("pulls and applies newer progress when this device has no changes", async () => {
    await linked();
    server.account = { rev: 2, data: await remotePayload(), updatedAt: 2 };

    await syncNow();

    expect((await getAllAttempts()).map((a) => a.id).sort()).toEqual(["local-1", "remote-1"]);
    expect((await getProfile())?.account?.rev).toBeGreaterThanOrEqual(2);
  });

  it("only reads when nothing changed anywhere", async () => {
    await linked();
    await syncNow();
    expect(server.calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("only ever calls the account's endpoint", async () => {
    await linked();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));
    await syncNow();
    for (const [url] of server.fetchMock.mock.calls) expect(String(url)).toBe("/api/progress");
  });
});

describe("startAutoSync", () => {
  it("uploads a change within a minute and doesn't loop on its own writes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    await linked();
    const stop = startAutoSync();

    // The first run checks at once (a read, nothing to upload).
    await vi.advanceTimersByTimeAsync(10);
    await vi.waitFor(() => expect(server.calls.filter((c) => c.method === "GET")).toHaveLength(1));

    await addAttempt(makeAttempt("local-2", "word:local", NOW));
    await vi.advanceTimersByTimeAsync(61_000);
    await vi.waitFor(() => expect(server.account!.rev).toBe(2));

    // Its own profile writes after the upload must not cause another one.
    const puts = () => server.calls.filter((c) => c.method === "PUT").length;
    const before = puts();
    await vi.advanceTimersByTimeAsync(130_000);
    expect(puts()).toBe(before);
    stop();
  });

  it("pushes with keepalive when the page is hidden", async () => {
    await linked();
    const stop = startAutoSync();
    await addAttempt(makeAttempt("local-2", "word:local", NOW));

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(server.account!.rev).toBe(2));
    expect(server.calls.find((c) => c.method === "PUT")?.keepalive).toBe(true);

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    stop();
  });
});

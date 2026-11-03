import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate } from "@/learning/attendance";
import { base64ToBytes, buildSnapshot, bytesToBase64, decodeSnapshot, encodeSnapshot, progressSummary, type LearnerState } from "@/learning/snapshot";
import { hardWords } from "@/learning/hard-words";
import { addAttempt, getAllAttempts } from "@/storage/attempts";
import { addAttendance, getAllAttendance } from "@/storage/attendance";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile, updateProfile } from "@/storage/meta";
import { readLearnerState } from "@/storage/replace";
import { makeAttempt, makeCard, resetStorage } from "@/storage/test-utils";
import { isAccountLinked, linkAccount, pushNow, syncNow, SyncError } from "./sync-client";
import { fakeSyncServer } from "./test-server";

// Feature 022: progress moves into the signed-in account and syncs through it (AC-014–AC-018, AC-006).

const NOW = Date.now();
const ACCOUNT = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null };

async function seedDevice(device = "device-a") {
  await saveProfile({ ...createDefaultProfile(NOW - 1000, () => device), level: "A2" });
  await putCards([makeCard("word:local", NOW, { last_review: NOW - 10, reps: 1 }), makeCard("grammar:present-simple", NOW)]);
  for (let i = 0; i < 3; i++) await addAttempt({ ...makeAttempt(`wrong-${i}`, "word:local", NOW - 100 + i), correct: false });
  await addAttendance({ date: "2026-10-20", points: 10, bonus: 0, at: NOW - 5000 });
}

async function anotherDevicesCopy(extra: Partial<LearnerState> = {}) {
  const state: LearnerState = {
    profile: { ...createDefaultProfile(NOW - 2000, () => "device-b"), level: "B1", fieldUpdatedAt: { level: NOW - 100 } },
    cards: [makeCard("word:remote", NOW, { last_review: NOW - 20, reps: 2 })],
    attempts: [makeAttempt("remote-1", "word:remote", NOW - 20)],
    lessons: [],
    extraLessons: [],
    claims: [],
    attendance: [{ date: "2026-10-21", points: 10, bonus: 0, at: NOW - 4000 }],
    ...extra,
  };
  return { rev: 4, data: bytesToBase64(await encodeSnapshot(buildSnapshot(state, NOW, "Asia/Ho_Chi_Minh"))), updatedAt: NOW - 50 };
}

async function decodeAccount(data: string) {
  const parsed = await decodeSnapshot(base64ToBytes(data));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.snapshot;
}

/** What the learner sees: the parts of progress the spec's zero-differences check compares. */
async function visible() {
  const state = await readLearnerState(NOW);
  const today = localDate(NOW, state.profile.timeZone);
  return {
    cards: state.cards.map((card) => card.itemId).sort(),
    attendance: state.attendance.map((row) => row.date).sort(),
    summary: progressSummary(state, today),
    hardWords: hardWords(state.attempts).map((word) => word.itemId),
  };
}

let server: ReturnType<typeof fakeSyncServer>;

beforeEach(async () => {
  await resetStorage();
  localStorage.clear();
  server = fakeSyncServer();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("linkAccount", () => {
  it("uploads this device's progress as a new account's first copy (AC-014)", async () => {
    await seedDevice();
    const summary = await linkAccount(ACCOUNT);

    const put = server.calls.find((call) => call.url === "/api/progress" && call.method === "PUT");
    expect(put?.body).toMatchObject({ rev: 0, deviceId: "device-a", countMe: true });
    const uploaded = await decodeAccount(server.account!.data);
    expect(uploaded.data.cards.map((card) => card.itemId).sort()).toEqual(["grammar:present-simple", "word:local"]);
    // The account link itself never leaves the device.
    expect(uploaded.data.meta).not.toHaveProperty("account");

    expect(summary).toMatchObject({ wordsLearned: 1, grammarLearned: 1, hardWords: 1 });
    const profile = await getProfile();
    expect(profile?.account).toMatchObject({ ...ACCOUNT, rev: 1, dirty: false });
    expect(isAccountLinked(profile)).toBe(true);
  });

  it("merges an account that already has progress with this device's, losing nothing (AC-015)", async () => {
    await seedDevice();
    server.account = await anotherDevicesCopy();
    await linkAccount(ACCOUNT);

    expect((await getAllCards()).map((card) => card.itemId).sort()).toEqual(["grammar:present-simple", "word:local", "word:remote"]);
    expect((await getAllAttendance()).map((row) => row.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect((await getProfile())?.level).toBe("B1"); // the later change wins
    expect(server.account?.rev).toBe(5);
    const merged = await decodeAccount(server.account!.data);
    expect(merged.data.cards).toHaveLength(3);
  });

  it("keeps the device's progress when the move fails, and finishes it later without counting twice (AC-018)", async () => {
    await seedDevice();
    server.account = await anotherDevicesCopy();
    server.offline = true;
    await expect(linkAccount(ACCOUNT)).rejects.toMatchObject({ kind: "offline" });
    expect(isAccountLinked(await getProfile())).toBe(false);
    expect(await getAllCards()).toHaveLength(2);

    server.offline = false;
    await linkAccount(ACCOUNT);
    await linkAccount(ACCOUNT); // a second visit runs it again
    expect(isAccountLinked(await getProfile())).toBe(true);
    expect((await getAllAttendance()).map((row) => row.date)).toEqual(["2026-10-20", "2026-10-21"]);
    expect((await getAllAttempts()).filter((a) => a.id === "remote-1")).toHaveLength(1);
    const summary = (await linkAccount(ACCOUNT)).points;
    expect(summary).toBe(20);
  });

  it("shows another device exactly the progress that moved (zero differences)", async () => {
    await seedDevice();
    await linkAccount(ACCOUNT);
    const before = await visible();

    // A second, empty device signs in to the same account.
    await resetStorage();
    localStorage.clear();
    await saveProfile(createDefaultProfile(NOW, () => "device-b"));
    await linkAccount(ACCOUNT);

    expect(await visible()).toEqual(before);
  });
});

describe("syncing through the account", () => {
  it("uploads later changes with this device's id and the stats choice", async () => {
    await seedDevice();
    await linkAccount(ACCOUNT);
    await updateProfile({ statsOptOut: true }, NOW + 1);
    await putCards([makeCard("word:new", NOW + 1)]);

    expect(await pushNow()).toBe(true);
    const last = server.calls.filter((call) => call.method === "PUT").at(-1);
    expect(last?.body).toMatchObject({ rev: 1, deviceId: "device-a", countMe: false });
    expect(server.account?.rev).toBe(2);
  });

  it("pulls another device's newer copy", async () => {
    await seedDevice();
    await linkAccount(ACCOUNT);
    const theirs = await anotherDevicesCopy();
    server.account = { ...theirs, rev: 7 };

    await syncNow();
    expect((await getAllCards()).map((card) => card.itemId)).toContain("word:remote");
  });

  it("marks the account expired when the session ends, keeping progress here (AC-006)", async () => {
    await seedDevice();
    await linkAccount(ACCOUNT);
    server.signedIn = false;
    await putCards([makeCard("word:offline-change", NOW + 2)]);

    await expect(syncNow()).rejects.toBeInstanceOf(SyncError);
    const profile = await getProfile();
    expect(profile?.account).toMatchObject({ expired: true });
    expect((await getAllCards()).map((card) => card.itemId)).toContain("word:offline-change");

    // Nothing more is sent until the learner signs in again.
    const sent = server.calls.length;
    await syncNow();
    expect(server.calls.length).toBe(sent);

    server.signedIn = true;
    await linkAccount(ACCOUNT);
    expect((await getProfile())?.account?.expired).toBe(false);
    expect((await decodeAccount(server.account!.data)).data.cards.map((card) => card.itemId)).toContain("word:offline-change");
  });
});

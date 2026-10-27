import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatsPayload } from "@/server/stats/stats.schema";
import { createDefaultProfile, saveProfile, updateProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import { countAttempt, countLessonCompleted, countPlacementDone, deltaOf, flushIfNewDay, flushOnHide, STATS_URL } from "./stats-client";
import { emptyDay, getStats } from "./stats-store";

const TZ = "Asia/Ho_Chi_Minh";
const DAY1 = Date.UTC(2026, 9, 27, 3); // 10:00 on 27 Oct in Vietnam
const DAY2 = Date.UTC(2026, 9, 28, 3);

const beacon = vi.fn<(url: string, data: Blob) => boolean>();

async function sentPayloads(): Promise<StatsPayload[]> {
  return Promise.all(beacon.mock.calls.map(async ([, blob]) => JSON.parse(await blob.text()) as StatsPayload));
}

beforeEach(async () => {
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(DAY1, () => "0f8fad5b-d9cb-469f-a165-70867728950e"), timeZone: TZ });
  beacon.mockReset().mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stats client", () => {
  it("counts attempts, lessons and placement for the local day", async () => {
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: false }, DAY1);
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
    await countAttempt({ exercise: "word-order", itemId: "sentence:x", correct: false }, DAY1);
    await countAttempt({ exercise: "study", itemId: "word:cat-n", correct: true }, DAY1);
    await countLessonCompleted(DAY1);
    await countPlacementDone(DAY1);

    const stats = await getStats();
    expect(stats?.day).toBe("2026-10-27");
    expect(stats?.total).toEqual({
      lessonsCompleted: 1,
      placementDone: true,
      exercises: { mcq: 2, "word-order": 1 },
      wrongWords: { "word:cat-n": 1 },
    });
    expect(beacon).not.toHaveBeenCalled();
  });

  it("rolls to a new day and reports the previous day once", async () => {
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: false }, DAY1);
    await countAttempt({ exercise: "listening", itemId: "word:dog-n", correct: true }, DAY2);

    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe(STATS_URL);
    expect(await sentPayloads()).toEqual([
      {
        day: "2026-10-27",
        deviceId: "0f8fad5b-d9cb-469f-a165-70867728950e",
        lessonsCompleted: 0,
        placementDone: false,
        exercises: { mcq: 1 },
        wrongWords: { "word:cat-n": 1 },
      },
    ]);
    expect((await getStats())?.day).toBe("2026-10-28");
    expect((await getStats())?.total.exercises).toEqual({ listening: 1 });

    await flushIfNewDay(DAY2, TZ);
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it("sends only new counts on each hide", async () => {
    vi.useFakeTimers({ now: DAY1, toFake: ["Date"] });
    try {
      await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
      await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
      await flushOnHide();
      await flushOnHide();
      await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
      await flushOnHide();
      // The new day finds nothing unsent from yesterday.
      await flushIfNewDay(DAY2, TZ);
    } finally {
      vi.useRealTimers();
    }

    const payloads = await sentPayloads();
    expect(payloads.map((p) => p.exercises)).toEqual([{ mcq: 2 }, { mcq: 1 }]);
  });

  it("counts and sends nothing when stats are turned off", async () => {
    await updateProfile({ statsOptOut: true }, DAY1);
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: false }, DAY1);
    await countLessonCompleted(DAY1);
    await flushOnHide();
    await flushIfNewDay(DAY2, TZ);
    expect(await getStats()).toBeUndefined();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("falls back to a keepalive fetch and ignores send failures", async () => {
    beacon.mockReturnValue(false);
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
    await expect(flushIfNewDay(DAY2, TZ)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(STATS_URL, expect.objectContaining({ method: "POST", keepalive: true }));
    // The report is dropped, not retried.
    expect((await getStats())?.day).toBe("2026-10-28");
  });

  it("ignores a throwing beacon", async () => {
    beacon.mockImplementation(() => {
      throw new Error("boom");
    });
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
    await expect(flushIfNewDay(DAY2, TZ)).resolves.toBeUndefined();
  });

  it("does nothing before a profile exists", async () => {
    await resetStorage();
    await countAttempt({ exercise: "mcq", itemId: "word:cat-n", correct: true }, DAY1);
    expect(await getStats()).toBeUndefined();
  });
});

describe("deltaOf", () => {
  it("caps the report to the 20 most-missed new words and the server limits", () => {
    const record = emptyDay("2026-10-27");
    for (let i = 0; i < 25; i++) record.total.wrongWords[`word:w${String(i).padStart(2, "0")}`] = i + 1;
    record.total.wrongWords["word:w24"] = 500;
    record.total.exercises.mcq = 5000;
    record.total.lessonsCompleted = 3;
    record.sent.lessonsCompleted = 1;
    const delta = deltaOf(record)!;
    expect(Object.keys(delta.wrongWords)).toHaveLength(20);
    expect(delta.wrongWords["word:w24"]).toBe(200);
    expect(delta.wrongWords["word:w04"]).toBeUndefined();
    expect(delta.exercises.mcq).toBe(2000);
    expect(delta.lessonsCompleted).toBe(2);
  });

  it("is undefined when everything was sent", () => {
    const record = emptyDay("2026-10-27");
    record.total.exercises.mcq = 2;
    record.sent.exercises.mcq = 2;
    expect(deltaOf(record)).toBeUndefined();
  });
});

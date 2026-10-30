import { beforeEach, describe, expect, it } from "vitest";
import type { DailyLesson } from "@/learning/types";
import { addAttempt, getAllAttempts, getAttemptsForItem, getAttemptsSince, newAttemptId, recordAnswer } from "./attempts";
import { getAllCards, getCard, getDueCards, putCards } from "./cards";
import { getContentCache, putContentCache } from "./content";
import { getExtraLesson, putExtraLesson } from "./extra-lessons";
import { getAllLessons, getLesson, putLesson } from "./lessons";
import { createDefaultProfile, getProfile, saveProfile, updateProfile } from "./meta";
import { makeAttempt, makeCard, resetStorage } from "./test-utils";

const lesson: DailyLesson = {
  date: "2026-10-26",
  contentVersion: 3,
  plan: [{ kind: "review", exercises: [{ kind: "mcq", itemIds: ["word:cat"], seed: 1 }] }],
  position: { part: 0, index: 0 },
  updatedAt: 1,
};

describe("storage repositories", () => {
  beforeEach(resetStorage);

  it("stores cards and lists the due ones, soonest first", async () => {
    await putCards([makeCard("word:a", 300), makeCard("word:b", 100), makeCard("grammar:x", 900)]);
    expect((await getDueCards(500)).map((card) => card.itemId)).toEqual(["word:b", "word:a"]);
    expect(await getAllCards()).toHaveLength(3);
    expect((await getCard("grammar:x"))?.due).toBe(900);
  });

  it("queries attempts per item in time order and since a time", async () => {
    await addAttempt(makeAttempt("1", "word:a", 30));
    await addAttempt(makeAttempt("2", "word:b", 20));
    await addAttempt(makeAttempt("3", "word:a", 10));
    await addAttempt(makeAttempt("4", "word:a", 40));
    expect((await getAttemptsForItem("word:a")).map((a) => a.id)).toEqual(["3", "1", "4"]);
    expect((await getAttemptsForItem("word:a", 2)).map((a) => a.id)).toEqual(["1", "4"]);
    expect((await getAttemptsSince(20)).map((a) => a.id)).toEqual(["2", "1", "4"]);
    expect(await getAllAttempts()).toHaveLength(4);
  });

  it("makes UUID attempt ids", () => {
    expect(newAttemptId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newAttemptId()).not.toBe(newAttemptId());
  });

  it("records an answer's attempt, card and lesson position together", async () => {
    await putLesson(lesson);
    await recordAnswer({
      attempt: makeAttempt("a1", "word:cat", 50),
      card: makeCard("word:cat", 999, { reps: 1 }),
      lesson: { date: lesson.date, position: { part: 0, index: 1 }, updatedAt: 50 },
    });
    expect(await getAttemptsForItem("word:cat")).toHaveLength(1);
    expect((await getCard("word:cat"))?.reps).toBe(1);
    expect(await getLesson(lesson.date)).toMatchObject({ position: { part: 0, index: 1 }, updatedAt: 50 });
  });

  it("moves an extra lesson's position with the answer, leaving the daily lesson alone (013)", async () => {
    await putLesson(lesson);
    await putExtraLesson({ id: "x", date: lesson.date, price: 10, purchasedAt: 1, contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 1 });
    await recordAnswer({ attempt: makeAttempt("a2", "word:cat", 60), lesson: { extraId: "x", position: { part: 1, index: 2 }, updatedAt: 60 } });
    expect(await getExtraLesson("x")).toMatchObject({ position: { part: 1, index: 2 }, updatedAt: 60 });
    expect((await getLesson(lesson.date))?.position).toEqual(lesson.position);
  });

  it("stores lessons by date", async () => {
    await putLesson(lesson);
    await putLesson({ ...lesson, date: "2026-10-25" });
    expect((await getAllLessons()).map((l) => l.date)).toEqual(["2026-10-25", "2026-10-26"]);
  });

  it("creates, saves and updates the profile with field timestamps", async () => {
    expect(await getProfile()).toBeUndefined();
    const profile = createDefaultProfile(1000, () => "device-1");
    expect(profile).toMatchObject({
      level: "A1",
      placement: "pending",
      tourSeen: false,
      statsOptOut: false,
      deviceId: "device-1",
      schemaVersion: 1,
      createdAt: 1000,
      fieldUpdatedAt: {},
    });
    expect(profile.timeZone).toBeTruthy();
    await saveProfile(profile);
    expect(await getProfile()).toEqual(profile);
    const updated = await updateProfile({ level: "B1", tourSeen: true }, 2000);
    expect(updated).toMatchObject({ level: "B1", tourSeen: true, deviceId: "device-1" });
    expect(updated.fieldUpdatedAt).toEqual({ level: 2000, tourSeen: 2000 });
    expect(await getProfile()).toEqual(updated);
  });

  it("caches content per kind and level", async () => {
    await putContentCache("word", "A1", { version: 4, items: [{ id: "cat" }], tombstones: ["dog"], fetchedAt: 5 });
    expect(await getContentCache("word", "A1")).toEqual({
      key: "word:A1",
      version: 4,
      items: [{ id: "cat" }],
      tombstones: ["dog"],
      fetchedAt: 5,
    });
    expect(await getContentCache("word", "A2")).toBeUndefined();
  });
});

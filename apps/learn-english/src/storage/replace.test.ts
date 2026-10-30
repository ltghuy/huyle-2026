import { beforeEach, describe, expect, it } from "vitest";
import { addAttempt, getAllAttempts } from "./attempts";
import { addAttendance, getAllAttendance } from "./attendance";
import { getAllCards, putCards } from "./cards";
import { getContentCache, putContentCache } from "./content";
import { getAllLessons, putLesson } from "./lessons";
import { createDefaultProfile, getProfile, saveProfile } from "./meta";
import { readLearnerState, replaceAll, resetAll } from "./replace";
import { makeAttempt, makeCard, resetStorage } from "./test-utils";

async function seed() {
  await saveProfile({ ...createDefaultProfile(1, () => "device-old"), level: "B1" });
  await putCards([makeCard("word:old", 1), makeCard("grammar:old", 1)]);
  await addAttempt(makeAttempt("a-old", "word:old", 1));
  await putLesson({ date: "2026-10-01", contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 1 });
  await addAttendance({ date: "2026-10-01", points: 10, bonus: 0, at: 1 });
  await putContentCache("word", "A1", { version: 1, items: [], tombstones: [], fetchedAt: 1 });
}

describe("replaceAll / resetAll", () => {
  beforeEach(resetStorage);

  it("reads every learner store", async () => {
    await seed();
    const state = await readLearnerState(5);
    expect(state.profile.level).toBe("B1");
    expect(state.cards).toHaveLength(2);
    expect(state.attempts).toHaveLength(1);
    expect(state.lessons).toHaveLength(1);
    expect(state.attendance).toHaveLength(1);
  });

  it("swaps all learner stores for the new state and keeps the content cache", async () => {
    await seed();
    await replaceAll({
      profile: { ...createDefaultProfile(2, () => "device-new"), level: "A2" },
      cards: [makeCard("word:new", 2)],
      attempts: [makeAttempt("a-new", "word:new", 2)],
      lessons: [],
      extraLessons: [],
      attendance: [{ date: "2026-10-20", points: 10, bonus: 0, at: 2 }],
    });

    expect((await getAllCards()).map((card) => card.itemId)).toEqual(["word:new"]);
    expect((await getAllAttempts()).map((attempt) => attempt.id)).toEqual(["a-new"]);
    expect(await getAllLessons()).toEqual([]);
    expect((await getAllAttendance()).map((row) => row.date)).toEqual(["2026-10-20"]);
    expect((await getProfile())?.level).toBe("A2");
    expect(await getContentCache("word", "A1")).toBeDefined();
  });

  it("resets to an empty default profile", async () => {
    await seed();
    await resetAll(10);
    const state = await readLearnerState(10);
    expect(state.profile).toMatchObject({ level: "A1", placement: "pending", createdAt: 10 });
    expect([state.cards, state.attempts, state.lessons, state.attendance]).toEqual([[], [], [], []]);
  });
});

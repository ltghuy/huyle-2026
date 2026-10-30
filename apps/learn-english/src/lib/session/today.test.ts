import { beforeEach, describe, expect, it } from "vitest";
import { sentence, vocabSet, word } from "@/learning/exercises/fixtures";
import { getAllAttendance } from "@/storage/attendance";
import { getLesson } from "@/storage/lessons";
import { resetStorage } from "@/storage/test-utils";
import { buildContentIndex } from "./content-index";
import { completeLesson, flattenLesson, getOrCreateTodayLesson, replanTodayIfUnstarted, saveLessonPosition } from "./today";

const words = ["apple", "cat", "table", "house", "dog", "book"].map((slug) =>
  word(slug, { meaningsVi: [`nghĩa ${slug}`], examples: [`sentence:${slug}-1`] }),
);
const sentences = words.map((w) => sentence(`${w.id.slice(5)}-1`, { tokens: ["I", "like", "the", w.body.headword], wordIds: [w.id], gapCandidates: [3] }));
const index = buildContentIndex([...words, ...sentences]);
const profile = { level: "A1" as const, timeZone: "Asia/Ho_Chi_Minh" };
const now = Date.UTC(2026, 9, 27, 3); // 10:00 in Vietnam

describe("today's lesson", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it("plans once per local date and returns the stored plan afterwards", async () => {
    const first = await getOrCreateTodayLesson({ profile, index, contentVersion: 1, now });
    const again = await getOrCreateTodayLesson({ profile, index, contentVersion: 2, now: now + 3_600_000 });
    expect(first.date).toBe("2026-10-27");
    expect(again).toEqual(first);
  });

  it("resumes from the saved position", async () => {
    const lesson = await getOrCreateTodayLesson({ profile, index, contentVersion: 1, now });
    const flat = flattenLesson(lesson, index);
    expect(flat.startAt).toBe(0);
    await saveLessonPosition(lesson.date, flat.positions[3], now);
    const resumed = flattenLesson((await getLesson(lesson.date))!, index);
    expect(resumed.startAt).toBe(3);
  });

  it("never moves the saved position backwards", async () => {
    const lesson = await getOrCreateTodayLesson({ profile, index, contentVersion: 1, now });
    const flat = flattenLesson(lesson, index);
    await saveLessonPosition(lesson.date, flat.positions[4], now);
    await saveLessonPosition(lesson.date, flat.positions[1], now);
    expect(flattenLesson((await getLesson(lesson.date))!, index).startAt).toBe(4);
  });

  it("awards attendance once, even when two tabs finish the lesson", async () => {
    const lesson = await getOrCreateTodayLesson({ profile, index, contentVersion: 1, now });
    const [a, b] = await Promise.all([completeLesson(lesson, now), completeLesson(lesson, now)]);
    expect([a.result, b.result].sort()).toEqual(["already-awarded", "awarded"]);
    expect([a.points, b.points].sort()).toEqual([0, 20]);
    expect(await getAllAttendance()).toHaveLength(1);
    expect((await getLesson(lesson.date))?.completedAt).toBe(now);
  });
});

describe("replanTodayIfUnstarted (feature 012)", () => {
  const deploy = word("deploy", { source: "specialized", examples: ["sentence:deploy-1"] }, "A2");
  const withSet = buildContentIndex([...words, ...sentences, vocabSet("it", [deploy], [sentence("deploy-1", { tokens: ["We", "deploy"] })])]);
  const following = { ...profile, vocabSet: "set:it" };
  const firstNewWord = (lesson: Awaited<ReturnType<typeof getOrCreateTodayLesson>>) =>
    lesson.plan.find((part) => part.kind === "new-words")?.exercises[0].itemIds[0];

  beforeEach(async () => {
    await resetStorage();
  });

  it("plans an unstarted lesson again with the set's words", async () => {
    const before = await getOrCreateTodayLesson({ profile, index: withSet, contentVersion: 1, now });
    expect(firstNewWord(before)).toBe("word:apple");
    expect(await replanTodayIfUnstarted({ profile: following, index: withSet, contentVersion: 1, now: now + 1000 })).toBe(true);
    const after = (await getLesson(before.date))!;
    expect(firstNewWord(after)).toBe(deploy.id);
    expect(after.updatedAt).toBe(now + 1000);
  });

  it("keeps a lesson already under way", async () => {
    const lesson = await getOrCreateTodayLesson({ profile, index: withSet, contentVersion: 1, now });
    await saveLessonPosition(lesson.date, flattenLesson(lesson, withSet).positions[1], now);
    expect(await replanTodayIfUnstarted({ profile: following, index: withSet, contentVersion: 1, now })).toBe(false);
    expect(firstNewWord((await getLesson(lesson.date))!)).toBe("word:apple");
  });

  it("does nothing when today has no lesson yet", async () => {
    expect(await replanTodayIfUnstarted({ profile: following, index: withSet, contentVersion: 1, now })).toBe(true);
    expect(await getLesson("2026-10-27")).toBeUndefined();
  });
});

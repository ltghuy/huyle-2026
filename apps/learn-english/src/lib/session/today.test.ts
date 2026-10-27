import { beforeEach, describe, expect, it } from "vitest";
import { sentence, word } from "@/learning/exercises/fixtures";
import { getAllAttendance } from "@/storage/attendance";
import { getLesson } from "@/storage/lessons";
import { resetStorage } from "@/storage/test-utils";
import { buildContentIndex } from "./content-index";
import { completeLesson, flattenLesson, getOrCreateTodayLesson, saveLessonPosition } from "./today";

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
    expect([a.points, b.points].sort()).toEqual([0, 10]);
    expect(await getAllAttendance()).toHaveLength(1);
    expect((await getLesson(lesson.date))?.completedAt).toBe(now);
  });
});

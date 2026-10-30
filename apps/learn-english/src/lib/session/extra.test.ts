import { beforeEach, describe, expect, it } from "vitest";
import { sentence, word } from "@/learning/exercises/fixtures";
import { getAllAttendance } from "@/storage/attendance";
import { putCards } from "@/storage/cards";
import { getAllExtraLessons } from "@/storage/extra-lessons";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { buildContentIndex } from "./content-index";
import { buyExtraLesson, completeExtraLesson, getExtraOffer, getOpenExtraLesson, saveExtraPosition } from "./extra";
import { completeLesson, getOrCreateTodayLesson } from "./today";

const words = Array.from({ length: 30 }, (_, i) => word(`w${i}`, { examples: [`sentence:w${i}-1`] }));
const sentences = words.map((w) => sentence(`${w.id.slice(5)}-1`, { tokens: ["I", "like", "the", w.body.headword], wordIds: [w.id], gapCandidates: [3] }));
const index = buildContentIndex([...words, ...sentences]);
const profile = { level: "A1" as const, timeZone: "Asia/Ho_Chi_Minh" };
const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 30, 3); // 10:00 in Vietnam
const input = (at = now) => ({ profile, index, contentVersion: 1, now: at });

/** Finishes today's daily lesson (20 points), carding its new words like answering them would. */
async function finishDaily(at = now) {
  const lesson = await getOrCreateTodayLesson(input(at));
  const ids = lesson.plan.flatMap((part) => (part.kind === "new-words" ? part.exercises.map((e) => e.itemIds[0]) : []));
  await putCards([...new Set(ids)].map((id) => makeCard(id as `word:${string}`, at + DAY)));
  await completeLesson(lesson, at);
}

async function buy(at = now) {
  const result = await buyExtraLesson(input(at));
  if (result.status !== "bought") throw new Error(`expected bought, got ${result.status}`);
  return result.lesson;
}

describe("extra lessons (013)", () => {
  beforeEach(resetStorage);

  it("are only on sale once today's lesson is done", async () => {
    expect((await getExtraOffer(input())).dailyDone).toBe(false);
    expect(await buyExtraLesson(input())).toEqual({ status: "daily-first" });
    await finishDaily();
    expect(await getExtraOffer(input())).toMatchObject({ dailyDone: true, balance: 20, price: 10, open: null, hasNewWords: true });
  });

  it("take the price from the balance and teach the next new words (AC-004, AC-005)", async () => {
    await finishDaily();
    const daily = await getOrCreateTodayLesson(input());
    const lesson = await buy();
    expect(lesson.price).toBe(10);
    const newWords = (plan: typeof lesson.plan) => plan.find((p) => p.kind === "new-words")!.exercises.map((e) => e.itemIds[0]);
    expect(newWords(lesson.plan).some((id) => newWords(daily.plan).includes(id))).toBe(false);
    expect((await getExtraOffer(input())).balance).toBe(10);
  });

  it("can be resumed without paying again, and the next one costs 30% more (AC-009)", async () => {
    await finishDaily();
    const lesson = await buy();
    await saveExtraPosition(lesson.id, { part: 1, index: 0 }, now + 1);
    expect(await buyExtraLesson(input())).toMatchObject({ status: "open", lesson: { id: lesson.id, position: { part: 1, index: 0 } } });
    expect((await getOpenExtraLesson(profile.timeZone, now))?.id).toBe(lesson.id);
    await completeExtraLesson(lesson.id, now + 2);
    expect(await getExtraOffer(input())).toMatchObject({ balance: 10, price: 13, open: null });
  });

  it("refuse a purchase without enough points and take nothing (AC-007)", async () => {
    await finishDaily();
    await completeExtraLesson((await buy()).id, now);
    expect(await buyExtraLesson(input())).toEqual({ status: "not-enough", balance: 10, price: 13 });
    expect(await getAllExtraLessons()).toHaveLength(1);
  });

  it("award no points and leave the streak alone when finished (AC-008)", async () => {
    await finishDaily();
    await completeExtraLesson((await buy()).id, now);
    expect(await getAllAttendance()).toHaveLength(1);
    expect((await getAllExtraLessons())[0].completedAt).toBe(now);
  });

  it("charge once when two tabs buy at the same moment", async () => {
    await finishDaily();
    const [a, b] = await Promise.all([buyExtraLesson(input()), buyExtraLesson(input())]);
    expect([a.status, b.status].sort()).toEqual(["bought", "open"]);
    expect(await getAllExtraLessons()).toHaveLength(1);
  });

  it("start at 10 again the next day, and drop yesterday's unfinished one (AC-006)", async () => {
    await finishDaily();
    await buy();
    const tomorrow = now + DAY;
    expect(await getOpenExtraLesson(profile.timeZone, tomorrow)).toBeNull();
    await finishDaily(tomorrow);
    expect(await getExtraOffer(input(tomorrow))).toMatchObject({ balance: 30, price: 10, open: null });
  });

  it("aren't sold when no new words are left", async () => {
    await putCards(words.map((w) => makeCard(w.id as `word:${string}`, now + DAY)));
    await finishDaily();
    expect((await getExtraOffer(input())).hasNewWords).toBe(false);
    expect(await buyExtraLesson(input())).toEqual({ status: "nothing-new" });
  });
});

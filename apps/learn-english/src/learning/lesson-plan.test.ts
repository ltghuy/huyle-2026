import { describe, expect, it } from "vitest";
import { grammar, sentence, word } from "./exercises/fixtures";
import type { GrammarItem, SentenceItem, WordItem } from "./exercises/types";
import {
  buildLessonPlan,
  dueCards,
  estimateMinutes,
  estimateSeconds,
  isGrammarDay,
  LESSON_BUDGET_SECONDS,
  isLevelExhausted,
  type LessonContent,
  type LessonPlanInput,
  type WritingItem,
} from "./lesson-plan";
import { retrievability } from "./srs";
import type { CardItemId, Level, StoredCard } from "./types";

const DAY = 86_400_000;
// 2026-10-28 is an even day number (grammar day); 2026-10-27 is odd.
const GRAMMAR_DATE = "2026-10-28";
const PLAIN_DATE = "2026-10-27";
const NOW = Date.parse("2026-10-28T03:00:00Z"); // 10:00 in Ho Chi Minh City

function card(itemId: string, opts: { dueIn?: number; stability?: number; daysSinceReview?: number; reps?: number } = {}): StoredCard {
  const { dueIn = -DAY, stability = 5, daysSinceReview = 6, reps = 3 } = opts;
  return {
    itemId: itemId as CardItemId,
    due: NOW + dueIn,
    stability,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 5,
    learning_steps: 0,
    reps,
    lapses: 0,
    state: 2,
    last_review: NOW - daysSinceReview * DAY,
    addedAt: NOW - 30 * DAY,
    updatedAt: NOW - daysSinceReview * DAY,
  };
}

function richSentence(slug: string, extra: Partial<SentenceItem["body"]> = {}): SentenceItem {
  return sentence(slug, {
    tokens: ["I", "like", slug],
    gapCandidates: [2],
    wrongVariants: [
      { en: `I likes ${slug}`, explanationVi: "a" },
      { en: `Me like ${slug}`, explanationVi: "b" },
      { en: `I liking ${slug}`, explanationVi: "c" },
    ],
    ...extra,
  });
}

function writingTask(slug: string, level: Level = "A1"): WritingItem {
  return {
    id: `writing:${slug}`,
    kind: "writing",
    level,
    sort: 0,
    body: { kind: "short-writing", promptVi: "Viết", useItems: [], modelAnswers: ["I like it."] },
  };
}

function wordsAt(level: Level, count: number, prefix = level.toLowerCase()): WordItem[] {
  return Array.from({ length: count }, (_, i) =>
    word(`${prefix}-${String(i).padStart(2, "0")}`, { examples: [`sentence:${prefix}-${i}`], audio: "a".repeat(64) }, level),
  );
}

function makeContent(overrides: Partial<LessonContent> = {}): LessonContent {
  const a1 = wordsAt("A1", 30);
  const a2 = wordsAt("A2", 30);
  const sentences = [...a1, ...a2].map((w, i) => richSentence(`${w.level.toLowerCase()}-${i % 30}`));
  const topics: GrammarItem[] = [
    { ...grammar("to-be", [{ prompt: "I ___ happy", answer: "am", explanationVi: "x" }]), sort: 0 },
    { ...grammar("present-simple", [{ prompt: "She ___ tea", answer: "drinks", explanationVi: "x" }]), sort: 1 },
  ];
  return {
    wordsByLevel: { A1: a1, A2: a2 },
    grammarByLevel: { A1: topics },
    sentences,
    writing: [writingTask("one"), writingTask("two"), writingTask("three")],
    skip: new Set(),
    ...overrides,
  };
}

function input(overrides: Partial<LessonPlanInput> = {}): LessonPlanInput {
  return {
    date: GRAMMAR_DATE,
    now: NOW,
    profile: { level: "A1", timeZone: "Asia/Ho_Chi_Minh" },
    cards: [],
    content: makeContent(),
    contentVersion: 7,
    ...overrides,
  };
}

const part = (lesson: ReturnType<typeof buildLessonPlan>, kind: string) => lesson.plan.find((p) => p.kind === kind);

describe("buildLessonPlan", () => {
  it("orders the parts review → new words → grammar → sentences → writing", () => {
    const lesson = buildLessonPlan(input({ cards: [card("word:a1-00"), card("grammar:to-be")] }));
    expect(lesson.plan.map((p) => p.kind)).toEqual(["review", "new-words", "grammar", "sentences", "writing"]);
    expect(lesson).toMatchObject({ date: GRAMMAR_DATE, contentVersion: 7, position: { part: 0, index: 0 }, updatedAt: NOW });
  });

  it("schedules grammar every 2nd day, with the next topic not yet started", () => {
    expect(isGrammarDay(GRAMMAR_DATE)).toBe(true);
    expect(isGrammarDay(PLAIN_DATE)).toBe(false);
    expect(part(buildLessonPlan(input({ date: PLAIN_DATE })), "grammar")).toBeUndefined();

    const grammarPart = part(buildLessonPlan(input({ cards: [card("grammar:to-be", { dueIn: DAY })] })), "grammar");
    expect(grammarPart?.exercises.map((e) => [e.kind, e.itemIds[0]])).toEqual([
      ["study", "grammar:present-simple"],
      ["grammar-gap", "grammar:present-simple"],
    ]);
  });

  it("puts due grammar cards into review on any day", () => {
    const lesson = buildLessonPlan(input({ date: PLAIN_DATE, cards: [card("grammar:to-be")] }));
    expect(part(lesson, "review")?.exercises).toEqual([expect.objectContaining({ kind: "grammar-gap", itemIds: ["grammar:to-be"] })]);
  });

  it("gives each new word a study step and a multiple-choice check", () => {
    const newWords = part(buildLessonPlan(input()), "new-words")!;
    expect(newWords.exercises).toHaveLength(20);
    expect(newWords.exercises.slice(0, 4).map((e) => [e.kind, e.itemIds[0]])).toEqual([
      ["study", "word:a1-00"],
      ["mcq", "word:a1-00"],
      ["study", "word:a1-01"],
      ["mcq", "word:a1-01"],
    ]);
  });

  it("takes 10 not-yet-carded words in order", () => {
    const cards = [card("word:a1-00", { dueIn: DAY }), card("word:a1-02", { dueIn: DAY })];
    const ids = part(buildLessonPlan(input({ cards })), "new-words")!.exercises.filter((e) => e.kind === "study").map((e) => e.itemIds[0]);
    expect(ids).toHaveLength(10);
    expect(ids.slice(0, 3)).toEqual(["word:a1-01", "word:a1-03", "word:a1-04"]);
  });

  it("reviews as many due items as fit in the time budget, lowest retrievability first, and drops to 5 new words on a backlog", () => {
    const cards = Array.from({ length: 60 }, (_, i) => card(`word:a1-${String(i % 30).padStart(2, "0")}-${i}`, { stability: 1 + i, daysSinceReview: 10 }));
    const lesson = buildLessonPlan(input({ cards }));
    const review = part(lesson, "review")!.exercises;
    expect(review.length).toBeGreaterThan(0);
    expect(review.length).toBeLessThan(60);
    const r = review.map((e) => retrievability(cards.find((c) => c.itemId === e.itemIds[0])!, NOW));
    expect(r).toEqual([...r].sort((a, b) => a - b));
    // The most stable (best remembered) items roll to later days.
    expect(review.map((e) => e.itemIds[0])).not.toContain(cards[59].itemId);
    expect(part(lesson, "new-words")!.exercises.filter((e) => e.kind === "study")).toHaveLength(5);
  });

  it("keeps 10 new words when every due review fits", () => {
    const cards = Array.from({ length: 5 }, (_, i) => card(`word:x-${i}`));
    const lesson = buildLessonPlan(input({ cards }));
    expect(part(lesson, "review")!.exercises).toHaveLength(5);
    expect(part(lesson, "new-words")!.exercises.filter((e) => e.kind === "study")).toHaveLength(10);
  });

  it.each([GRAMMAR_DATE, PLAIN_DATE])("keeps the lesson within 15 minutes, even with 200 reviews due (%s)", (date) => {
    const steps = (cards: StoredCard[]) => buildLessonPlan(input({ date, cards })).plan.flatMap((p) => p.exercises);
    const backlog = Array.from({ length: 200 }, (_, i) => card(`word:b-${i}`, { stability: 1 + i }));
    for (const cards of [[], backlog]) {
      expect(estimateSeconds(steps(cards))).toBeLessThanOrEqual(LESSON_BUDGET_SECONDS);
      expect(estimateMinutes(steps(cards))).toBeLessThanOrEqual(15);
    }
    // The backlog fills most of the budget instead of leaving it unused.
    expect(estimateSeconds(steps(backlog))).toBeGreaterThan(LESSON_BUDGET_SECONDS - 60);
  });

  it("only reviews cards due by the end of the learner's day", () => {
    // 23:00 local today is due; 01:00 local tomorrow is not.
    const today = card("word:a1-00", { dueIn: Date.parse("2026-10-28T16:00:00Z") - NOW });
    const tomorrow = card("word:a1-01", { dueIn: Date.parse("2026-10-28T18:00:00Z") - NOW });
    const due = dueCards(input({ cards: [today, tomorrow] }));
    expect(due.map((c) => c.itemId)).toEqual(["word:a1-00"]);
  });

  it("varies the review exercise kind for an item from one review to the next (AC-012)", () => {
    const kinds = new Set(
      [1, 2, 3, 4].map((reps) => {
        const lesson = buildLessonPlan(input({ cards: [card("word:a1-05", { reps, stability: 50 }), card("word:a1-06", { reps: 1 })] }));
        return part(lesson, "review")!.exercises.find((e) => e.itemIds[0] === "word:a1-05")!.kind;
      }),
    );
    expect(kinds).toEqual(new Set(["mcq", "missing-letters", "listening", "recall"]));
  });

  it("puts at least one multiple choice into a non-empty review", () => {
    for (let reps = 0; reps < 4; reps++) {
      const lesson = buildLessonPlan(input({ cards: [card("word:a1-07", { reps })] }));
      expect(part(lesson, "review")!.exercises.map((e) => e.kind)).toEqual(["mcq"]);
    }
  });

  it("never plans listening for a word without audio", () => {
    const silent = wordsAt("A1", 1, "silent").map((w) => ({ ...w, body: { ...w.body, audio: "" } }));
    const content = makeContent({ wordsByLevel: { A1: [...silent, ...wordsAt("A1", 30)] } });
    const kinds = [0, 1, 2, 3, 4, 5].map((reps) => {
      const lesson = buildLessonPlan(input({ content, cards: [card("word:silent-00", { reps, stability: 50 }), card("word:a1-00", { reps: 0 })] }));
      return part(lesson, "review")!.exercises.find((e) => e.itemIds[0] === "word:silent-00")!.kind;
    });
    expect(kinds).not.toContain("listening");
  });

  it("builds 3 sentence tasks with rotating kinds, skipping kinds a sentence can't support", () => {
    const sentences = part(buildLessonPlan(input()), "sentences")!.exercises;
    expect(sentences).toHaveLength(3);
    expect(new Set(sentences.map((e) => e.kind)).size).toBe(3);
    expect(sentences.every((e) => e.itemIds[0].startsWith("sentence:a1-"))).toBe(true);

    const plain = makeContent();
    const bare = { ...plain, sentences: plain.sentences.map((s) => ({ ...s, body: { ...s.body, gapCandidates: [], wrongVariants: [] } })) };
    const kinds = part(buildLessonPlan(input({ content: bare })), "sentences")!.exercises.map((e) => e.kind);
    expect(kinds).toHaveLength(3);
    expect(kinds.every((kind) => kind === "word-order" || kind === "tile-translate")).toBe(true);
  });

  it("picks one writing task at the level, avoiding recent ones", () => {
    const lesson = buildLessonPlan(input({ recentWritingIds: ["writing:one", "writing:two"] }));
    expect(part(lesson, "writing")!.exercises).toEqual([expect.objectContaining({ kind: "writing", itemIds: ["writing:three"] })]);

    const allRecent = buildLessonPlan(input({ recentWritingIds: ["writing:one", "writing:two", "writing:three"] }));
    expect(part(allRecent, "writing")!.exercises).toHaveLength(1);
  });

  it("is deterministic per date and gives every exercise its own seed", () => {
    const cards = [card("word:a1-00"), card("word:a1-01"), card("grammar:to-be")];
    const a = buildLessonPlan(input({ cards }));
    expect(buildLessonPlan(input({ cards }))).toEqual(a);
    const seeds = a.plan.flatMap((p) => p.exercises.map((e) => e.seed));
    expect(new Set(seeds).size).toBe(seeds.length);
    const otherDay = buildLessonPlan(input({ cards, date: "2026-10-30" }));
    expect(otherDay.plan.flatMap((p) => p.exercises.map((e) => e.seed))).not.toEqual(seeds);
  });

  it("skips tombstoned items everywhere", () => {
    const skip = new Set(["word:a1-00", "word:a1-01", "grammar:to-be", "writing:one", "writing:two", "sentence:a1-2"]);
    const content = makeContent({ skip });
    const lesson = buildLessonPlan(input({ content, cards: [card("word:a1-00"), card("grammar:to-be"), card("word:a1-05")] }));
    const ids = lesson.plan.flatMap((p) => p.exercises.flatMap((e) => e.itemIds));
    for (const id of skip) expect(ids).not.toContain(id);
    expect(part(lesson, "grammar")!.exercises[0].itemIds).toEqual(["grammar:present-simple"]);
    expect(part(lesson, "writing")!.exercises[0].itemIds).toEqual(["writing:three"]);
  });

  it("uses the profile's level, so a level change applies to the next plan (AC-022)", () => {
    const a2 = buildLessonPlan(input({ profile: { level: "A2", timeZone: "Asia/Ho_Chi_Minh" } }));
    expect(part(a2, "new-words")!.exercises[0].itemIds).toEqual(["word:a2-00"]);
    expect(part(a2, "grammar")).toBeUndefined(); // no A2 topics in the fixture
  });

  it("continues into the next level when the level runs out, and flags it", () => {
    const content = makeContent({ wordsByLevel: { A1: wordsAt("A1", 4), A2: wordsAt("A2", 30) } });
    const cards = [card("word:a1-00", { dueIn: DAY })];
    const ids = part(buildLessonPlan(input({ content, cards })), "new-words")!
      .exercises.filter((e) => e.kind === "study")
      .map((e) => e.itemIds[0]);
    expect(ids).toEqual(["word:a1-01", "word:a1-02", "word:a1-03", ...Array.from({ length: 7 }, (_, i) => `word:a2-0${i}`)]);
    expect(isLevelExhausted({ level: "A1" }, cards, content)).toBe(true);
    expect(isLevelExhausted({ level: "A1" }, [], makeContent())).toBe(false);
  });

  it("returns an empty plan for empty content and no cards", () => {
    const empty: LessonContent = { wordsByLevel: {}, grammarByLevel: {}, sentences: [], writing: [], skip: new Set() };
    expect(buildLessonPlan(input({ content: empty })).plan).toEqual([]);
  });

  it("has no review part when nothing is due", () => {
    const lesson = buildLessonPlan(input({ cards: [card("word:a1-00", { dueIn: 3 * DAY })] }));
    expect(lesson.plan[0].kind).toBe("new-words");
  });
});

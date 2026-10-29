import { beforeEach, describe, expect, it } from "vitest";
import { forms, grammar, sentence, vocabSet, word } from "@/learning/exercises/fixtures";
import { reviewSession } from "./review";
import { getAllAttempts } from "@/storage/attempts";
import { getCard, putCards } from "@/storage/cards";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { buildContentIndex } from "./content-index";
import { prepareStep, prepareSteps } from "./prepare";
import { recordOutcome } from "./record";

const words = [
  word("apple", { meaningsVi: ["quả táo"], examples: ["sentence:apple-1"] }),
  word("cat", { meaningsVi: ["con mèo"] }),
  word("table", { meaningsVi: ["cái bàn"] }),
  word("house", { meaningsVi: ["ngôi nhà"] }),
];
const simple = grammar("present-simple", [{ prompt: "She ___ tea.", options: ["drink", "drinks", "drinking", "drank"], answer: "drinks", explanationVi: "Ngôi thứ ba số ít thêm -s." }]);
const example = sentence("apple-1", {
  tokens: ["I", "eat", "an", "apple"],
  wordIds: ["word:apple"],
  grammarSlug: "present-simple",
  gapCandidates: [3],
});
const go = word("go", { pos: "verb", meaningsVi: ["đi"] });
const goForms = forms("go", ["went"], ["gone"], { audio: "b".repeat(64) });
const index = buildContentIndex([...words, simple, example, go, goForms], new Set(["word:house-gone"]));

describe("prepareStep with vocabulary sets (feature 012)", () => {
  const jargon = ["deploy", "commit", "merge", "branch", "server", "bug", "release", "backend", "frontend", "database", "cache"].map((slug) =>
    word(`it-${slug}`, { source: "specialized", meaningsVi: [`nghĩa ${slug}`], examples: [`sentence:it-${slug}-1`] }, "A1"),
  );
  const deployExample = sentence("it-deploy-1", { tokens: ["We", "deploy", "today"], wordIds: ["word:it-deploy"], gapCandidates: [1] });
  const withSet = buildContentIndex([...words, vocabSet("it", jargon, [deployExample])]);
  const setIds = new Set(jargon.map((item) => item.id));

  it("draws a specialized word's multiple-choice options from its set", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const step = prepareStep({ kind: "mcq", itemIds: ["word:it-deploy"], seed }, withSet, "k");
      if (step?.type !== "exercise" || step.instance.kind !== "mcq") throw new Error("expected an mcq");
      expect(step.instance.options.every((option) => setIds.has(option.wordId))).toBe(true);
    }
  });

  it("keeps level words' options at their level", () => {
    const step = prepareStep({ kind: "mcq", itemIds: ["word:apple"], seed: 4 }, withSet, "k");
    if (step?.type !== "exercise" || step.instance.kind !== "mcq") throw new Error("expected an mcq");
    expect(step.instance.options.some((option) => setIds.has(option.wordId))).toBe(false);
  });

  it("tops up a small set's pool with level words", () => {
    const small = buildContentIndex([...words, vocabSet("tiny", jargon.slice(0, 2))]);
    expect(prepareStep({ kind: "mcq", itemIds: ["word:it-deploy"], seed: 1 }, small, "k")).not.toBeNull();
  });

  it("uses set words as gap distractors for a specialized word's example", () => {
    const step = prepareStep({ kind: "sentence-gap", itemIds: ["sentence:it-deploy-1"], seed: 5 }, withSet, "k");
    if (step?.type !== "exercise" || step.instance.kind !== "sentence-gap") throw new Error("expected a gap");
    const headwords = new Set(jargon.map((item) => item.body.headword));
    const options = (step.instance.options ?? []).filter((option) => option !== "deploy");
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((option) => headwords.has(option))).toBe(true);
  });
});

describe("prepareStep", () => {
  it("builds a study card with its example sentences", () => {
    const step = prepareStep({ kind: "study", itemIds: ["word:apple"], seed: 1 }, index, "k");
    expect(step).toMatchObject({ type: "study", item: { id: "word:apple" }, examples: [{ id: "sentence:apple-1" }] });
  });

  it("gives listening a recall fallback", () => {
    const step = prepareStep({ kind: "listening", itemIds: ["word:apple"], seed: 2 }, index, "k");
    expect(step).toMatchObject({ type: "exercise", instance: { kind: "listening" }, fallback: { kind: "recall" } });
  });

  it("links a sentence task to its grammar point and words", () => {
    const step = prepareStep({ kind: "sentence-gap", itemIds: ["sentence:apple-1"], seed: 3 }, index, "k");
    expect(step).toMatchObject({
      type: "exercise",
      instance: { kind: "sentence-gap" },
      related: { cardIds: ["word:apple", "grammar:present-simple"], link: { href: "/grammar?topic=present-simple", label: "present-simple" } },
    });
  });

  it("gives dictation a word-order fallback and skips sentences it can't use (010)", () => {
    const heard = sentence("heard", { tokens: ["I", "eat", "an", "apple."], audio: "c".repeat(64), wordIds: ["word:apple"] });
    const year = sentence("year", { tokens: ["It", "opened", "in", "1990."], audio: "d".repeat(64) });
    const local = buildContentIndex([...words, heard, year]);
    expect(prepareStep({ kind: "dictation", itemIds: ["sentence:heard"], seed: 1 }, local, "k")).toMatchObject({
      type: "exercise",
      instance: { kind: "dictation", wordCount: 4 },
      fallback: { kind: "word-order" },
      related: { cardIds: ["word:apple"] },
    });
    expect(prepareStep({ kind: "dictation", itemIds: ["sentence:year"], seed: 1 }, local, "k")).toBeNull();
    expect(prepareStep({ kind: "dictation", itemIds: ["sentence:apple-1"], seed: 1 }, index, "k")).toBeNull(); // no audio
  });

  it("builds find-the-error with the sentence's related cards, and skips sentences it can't use (011)", () => {
    const findable = sentence("ability", {
      tokens: ["She", "has", "the", "ability", "to", "learn", "languages", "fast."],
      wrongVariants: [{ en: "She has the ability to learning languages fast.", explanationVi: "Sau to dùng động từ nguyên mẫu." }],
      wordIds: ["word:apple"],
    });
    const local = buildContentIndex([...words, findable]);
    expect(prepareStep({ kind: "find-error", itemIds: ["sentence:ability"], seed: 1 }, local, "k")).toMatchObject({
      type: "exercise",
      instance: { kind: "find-error", correction: "learn" },
      related: { cardIds: ["word:apple"] },
    });
    expect(prepareStep({ kind: "find-error", itemIds: ["sentence:apple-1"], seed: 1 }, index, "k")).toBeNull();
  });

  it("skips steps whose content is missing or can't support the exercise", () => {
    const descriptors = [
      { kind: "mcq" as const, itemIds: ["word:missing"], seed: 1 },
      { kind: "choose-sentence" as const, itemIds: ["sentence:apple-1"], seed: 1 }, // no wrong variants
      { kind: "recall" as const, itemIds: ["word:cat"], seed: 1 },
    ];
    expect(prepareSteps(descriptors, index, "p").map((step) => step.key)).toEqual(["p-2"]);
  });
});

describe("verb forms steps (feature 008)", () => {
  it.each(["forms-typing", "forms-gap", "forms-listening"] as const)("builds %s on the forms card", (kind) => {
    const step = prepareStep({ kind, itemIds: ["forms:go"], seed: 2 }, index, "k");
    expect(step).toMatchObject({ type: "exercise", instance: { kind, targetId: "forms:go", verb: { headword: "go" } } });
  });

  it("gives listening a typing fallback, and skips forms whose verb is gone", () => {
    expect(prepareStep({ kind: "forms-listening", itemIds: ["forms:go"], seed: 1 }, index, "k")).toMatchObject({ fallback: { kind: "forms-typing" } });
    const orphan = buildContentIndex([forms("fly", ["flew"], ["flown"])]);
    expect(prepareStep({ kind: "forms-typing", itemIds: ["forms:fly"], seed: 1 }, orphan, "k")).toBeNull();
  });

  it("reviews forms cards with forms exercises, never multiple choice (AC-009)", () => {
    const due = [makeCard("forms:go", 0, { reps: 0 }), makeCard("forms:go", 0, { reps: 1 }), makeCard("forms:go", 0, { reps: 2 })];
    const kinds = reviewSession(due, index, 0).map((descriptor) => descriptor.kind);
    expect(new Set(kinds)).toEqual(new Set(["forms-typing", "forms-gap", "forms-listening"]));
  });
});

describe("recordOutcome", () => {
  const now = Date.UTC(2026, 9, 27, 3);

  beforeEach(async () => {
    await resetStorage();
  });

  it("creates the card on the first check of a new word and logs the attempt", async () => {
    await recordOutcome({
      outcome: { itemId: "word:apple", exercise: "mcq", result: { correct: true, expected: "quả táo" }, ms: 2000, related: [] },
      context: "lesson",
      now,
    });
    const card = await getCard("word:apple");
    expect(card?.reps).toBe(1);
    const [attempt] = await getAllAttempts();
    expect(attempt).toMatchObject({ itemId: "word:apple", correct: true, rating: "good", context: "lesson", selfMarked: false });
  });

  it("schedules a verb's forms on their own card, leaving its word card alone (008 AC-008)", async () => {
    await putCards([makeCard("word:go", now + 5 * 86_400_000, { reps: 4 })]);
    await recordOutcome({
      outcome: { itemId: "forms:go", exercise: "forms-typing", result: { correct: false, expected: "went" }, ms: 4000, related: [] },
      context: "review",
      now,
    });
    expect(await getCard("forms:go")).toMatchObject({ itemId: "forms:go", reps: 1 });
    expect(await getCard("word:go")).toMatchObject({ due: now + 5 * 86_400_000, reps: 4 });
  });

  it("brings related cards forward after a wrong sentence answer", async () => {
    await putCards([makeCard("grammar:present-simple", now + 5 * 86_400_000), makeCard("word:apple", now + 86_400_000)]);
    await recordOutcome({
      outcome: { itemId: "sentence:apple-1", exercise: "word-order", result: { correct: false, expected: "I eat an apple" }, ms: 9000, related: ["word:apple", "grammar:present-simple"] },
      context: "lesson",
      now,
    });
    expect((await getCard("grammar:present-simple"))?.due).toBe(now);
    expect((await getCard("word:apple"))?.due).toBe(now);
    expect(await getCard("sentence:apple-1" as never)).toBeUndefined();
  });

  it("records a hinted answer as hinted and Hard (010 AC-015)", async () => {
    await recordOutcome({
      outcome: { itemId: "sentence:apple-1", exercise: "dictation", result: { correct: true, hinted: true, expected: "I eat an apple" }, ms: 3000, related: [] },
      context: "exercise",
      now,
    });
    const [attempt] = await getAllAttempts();
    expect(attempt).toMatchObject({ exercise: "dictation", hinted: true, rating: "hard" });
  });

  it("marks free writing as self-checked", async () => {
    await recordOutcome({
      outcome: { itemId: "writing:a1-1", exercise: "writing", result: { correct: false, expected: "x" }, ms: 60_000, related: [] },
      context: "lesson",
      now,
    });
    const [attempt] = await getAllAttempts();
    expect(attempt).toMatchObject({ selfMarked: true, rating: "again" });
  });
});

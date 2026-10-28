import { beforeEach, describe, expect, it } from "vitest";
import { forms, grammar, sentence, word } from "@/learning/exercises/fixtures";
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

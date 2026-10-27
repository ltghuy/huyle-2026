import { beforeEach, describe, expect, it } from "vitest";
import { grammar, sentence, word } from "@/learning/exercises/fixtures";
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
const index = buildContentIndex([...words, simple, example], new Set(["word:house-gone"]));

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
      related: { cardIds: ["word:apple", "grammar:present-simple"], link: { href: "/ngu-phap?bai=present-simple", label: "present-simple" } },
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

import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { isAcceptedOrder } from "./tiles";
import { buildWordOrder, gradeWordOrder, WORD_ORDER_DISTRACTORS } from "./word-order";

// "I play football on Sunday." / "On Sunday I play football."
const movable = sentence("sunday", {
  tokens: ["I", "play", "football", "on", "Sunday"],
  acceptedOrders: [
    [0, 1, 2, 3, 4],
    [3, 4, 0, 1, 2],
  ],
});
// "The cat sat on the mat": "The" and "the" are interchangeable.
const repeated = sentence("cat", { tokens: ["The", "cat", "sat", "on", "the", "mat"] });
// "I have a dog." with reviewed wrong variants giving "has" and "an".
const dog = sentence("dog", {
  tokens: ["I", "have", "a", "dog"],
  wrongVariants: [
    { en: "I has a dog.", explanationVi: "x" },
    { en: "I have an dog.", explanationVi: "x" },
    { en: "I have dog.", explanationVi: "x" },
  ],
});
const POOL = ["apple", "run", "blue"];

const extras = (ex: ReturnType<typeof buildWordOrder>) => ex.tiles.filter((t) => t.id >= ex.body.tokens.length).map((t) => t.text);

describe("buildWordOrder", () => {
  it("has one tile per token, keeping the original casing", () => {
    const ex = buildWordOrder({ sentence: repeated, distractorPool: [] }, 1);
    expect(ex.tiles.map((t) => t.id).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ex.tiles.map((t) => t.text).sort()).toEqual(["The", "cat", "mat", "on", "sat", "the"]);
  });

  it("adds distractors from the wrong variants first, then from the pool", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(extras(buildWordOrder({ sentence: dog, distractorPool: POOL }, seed)).sort()).toEqual(["an", "has"]);
      const fromPool = extras(buildWordOrder({ sentence: movable, distractorPool: POOL }, seed));
      expect(fromPool).toHaveLength(WORD_ORDER_DISTRACTORS);
      for (const text of fromPool) expect(POOL).toContain(text);
    }
  });

  it("never uses a sentence word as a distractor, whatever its case or punctuation", () => {
    const amSentence = sentence("am", {
      tokens: ["I", "get", "up", "at", "6", "a.m"],
      wrongVariants: [{ en: "I get up at a.m. 6.", explanationVi: "x" }],
    });
    const ex = buildWordOrder({ sentence: amSentence, distractorPool: ["Up", "a.m.", "I", "late"] }, 1);
    expect(extras(ex)).toEqual(["late"]);
  });

  it("keeps only the sentence's tiles when nothing is left to add", () => {
    const ex = buildWordOrder({ sentence: movable, distractorPool: ["Sunday", "play"] }, 1);
    expect(ex.tiles).toHaveLength(movable.body.tokens.length);
  });

  it("never starts in an accepted order when it can avoid it", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const s of [movable, repeated]) {
        const ex = buildWordOrder({ sentence: s, distractorPool: POOL }, seed);
        expect(isAcceptedOrder(s.body, ex.tiles.map((t) => t.id).filter((id) => id < s.body.tokens.length))).toBe(false);
      }
    }
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(buildWordOrder({ sentence: movable, distractorPool: POOL }, 5)).toEqual(buildWordOrder({ sentence: movable, distractorPool: POOL }, 5));
    const orders = new Set(
      Array.from({ length: 20 }, (_, s) => JSON.stringify(buildWordOrder({ sentence: movable, distractorPool: POOL }, s).tiles)),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("gradeWordOrder", () => {
  it("accepts every accepted order", () => {
    const ex = buildWordOrder({ sentence: movable, distractorPool: POOL }, 1);
    for (const order of movable.body.acceptedOrders) {
      expect(gradeWordOrder(ex, order)).toEqual({ correct: true, expected: movable.body.en });
    }
  });

  it("rejects an order that is not listed", () => {
    const ex = buildWordOrder({ sentence: movable, distractorPool: POOL }, 1);
    expect(gradeWordOrder(ex, [2, 1, 0, 3, 4]).correct).toBe(false);
  });

  it("treats duplicate tokens as interchangeable", () => {
    const ex = buildWordOrder({ sentence: repeated, distractorPool: POOL }, 1);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4, 5]).correct).toBe(true);
    expect(gradeWordOrder(ex, [4, 1, 2, 3, 0, 5]).correct).toBe(true);
  });

  it("rejects an answer that uses a distractor", () => {
    const ex = buildWordOrder({ sentence: dog, distractorPool: POOL }, 1);
    const has = ex.tiles.find((t) => t.text === "has")!.id;
    expect(gradeWordOrder(ex, [0, has, 2, 3]).correct).toBe(false);
  });

  it("rejects incomplete, repeated or unknown tiles", () => {
    const ex = buildWordOrder({ sentence: repeated, distractorPool: POOL }, 1);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4]).correct).toBe(false);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 0, 5]).correct).toBe(false);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4, 9]).correct).toBe(false);
  });
});

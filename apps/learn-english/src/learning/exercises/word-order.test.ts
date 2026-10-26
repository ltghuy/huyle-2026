import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { isAcceptedOrder } from "./tiles";
import { buildWordOrder, gradeWordOrder } from "./word-order";

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

describe("buildWordOrder", () => {
  it("has one tile per token, keeping the original casing", () => {
    const ex = buildWordOrder({ sentence: repeated }, 1);
    expect(ex.tiles.map((t) => t.id).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ex.tiles.map((t) => t.text).sort()).toEqual(["The", "cat", "mat", "on", "sat", "the"]);
  });

  it("never starts in an accepted order when it can avoid it", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const s of [movable, repeated]) {
        const ex = buildWordOrder({ sentence: s }, seed);
        expect(isAcceptedOrder(s.body, ex.tiles.map((t) => t.id))).toBe(false);
      }
    }
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(buildWordOrder({ sentence: movable }, 5)).toEqual(buildWordOrder({ sentence: movable }, 5));
    const orders = new Set(
      Array.from({ length: 20 }, (_, s) => JSON.stringify(buildWordOrder({ sentence: movable }, s).tiles)),
    );
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("gradeWordOrder", () => {
  it("accepts every accepted order", () => {
    const ex = buildWordOrder({ sentence: movable }, 1);
    for (const order of movable.body.acceptedOrders) {
      expect(gradeWordOrder(ex, order)).toEqual({ correct: true, expected: movable.body.en });
    }
  });

  it("rejects an order that is not listed", () => {
    const ex = buildWordOrder({ sentence: movable }, 1);
    expect(gradeWordOrder(ex, [2, 1, 0, 3, 4]).correct).toBe(false);
  });

  it("treats duplicate tokens as interchangeable", () => {
    const ex = buildWordOrder({ sentence: repeated }, 1);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4, 5]).correct).toBe(true);
    expect(gradeWordOrder(ex, [4, 1, 2, 3, 0, 5]).correct).toBe(true);
  });

  it("rejects incomplete, repeated or unknown tiles", () => {
    const ex = buildWordOrder({ sentence: repeated }, 1);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4]).correct).toBe(false);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 0, 5]).correct).toBe(false);
    expect(gradeWordOrder(ex, [0, 1, 2, 3, 4, 9]).correct).toBe(false);
  });
});

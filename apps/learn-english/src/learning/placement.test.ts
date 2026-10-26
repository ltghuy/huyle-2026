import { describe, expect, it } from "vitest";
import {
  isFinished,
  itemsAnswered,
  MAX_ITEMS,
  nextLevel,
  recordAnswer,
  result,
  startPlacement,
  type PlacementState,
} from "./placement";
import type { Level } from "./types";

/** Run the test, answering with `answer(level, n)` until it finishes. */
function run(answer: (level: Level, n: number) => boolean): { state: PlacementState; levels: Level[] } {
  let state = startPlacement();
  const levels: Level[] = [];
  while (!isFinished(state) && levels.length < 100) {
    const level = nextLevel(state);
    levels.push(level);
    state = recordAnswer(state, answer(level, levels.length - 1));
  }
  return { state, levels };
}

/** Answer a stage with `correct` right answers out of 5. */
function stage(state: PlacementState, correct: number): PlacementState {
  for (let i = 0; i < 5; i++) state = recordAnswer(state, i < correct);
  return state;
}

describe("placement", () => {
  it("starts at A2", () => {
    const state = startPlacement();
    expect(nextLevel(state)).toBe("A2");
    expect(isFinished(state)).toBe(false);
    expect(itemsAnswered(state)).toBe(0);
  });

  it("stays at a level for 5 items", () => {
    let state = startPlacement();
    for (let i = 0; i < 4; i++) {
      state = recordAnswer(state, true);
      expect(nextLevel(state)).toBe("A2");
    }
    expect(nextLevel(recordAnswer(state, true))).toBe("B1");
  });

  it("moves up on 4/5 and down on 2/5", () => {
    expect(nextLevel(stage(startPlacement(), 4))).toBe("B1");
    expect(nextLevel(stage(startPlacement(), 2))).toBe("A1");
  });

  it("stops on 3/5 at the current level", () => {
    const state = stage(stage(startPlacement(), 5), 3);
    expect(isFinished(state)).toBe(true);
    expect(result(state)).toBe("B1");
  });

  it("stops when bouncing between two levels, at the lower one", () => {
    const upThenDown = stage(stage(stage(startPlacement(), 4), 4), 1); // A2 → B1 → B2 ✗
    expect(isFinished(upThenDown)).toBe(true);
    expect(result(upThenDown)).toBe("B1");

    const downThenUp = stage(stage(startPlacement(), 0), 5); // A2 ✗ → A1 ✓
    expect(isFinished(downThenUp)).toBe(true);
    expect(result(downThenUp)).toBe("A1");
  });

  it("places all-correct at C1", () => {
    const { state, levels } = run(() => true);
    expect(result(state)).toBe("C1");
    expect(levels.length).toBeLessThanOrEqual(MAX_ITEMS);
    expect(new Set(levels)).toEqual(new Set(["A2", "B1", "B2", "C1"]));
  });

  it("places all-wrong at A1", () => {
    const { state, levels } = run(() => false);
    expect(result(state)).toBe("A1");
    expect(levels).toHaveLength(10);
  });

  it("places mixed answers in the middle", () => {
    const easy: Level[] = ["A1", "A2", "B1"];
    const { state } = run((level) => easy.includes(level));
    expect(result(state)).toBe("B1");
    expect(result(run((_, n) => n % 2 === 0).state)).toBe("A2"); // 3/5 at A2
  });

  it("never asks more than 30 items, whatever the answers", () => {
    let seed = 42;
    const random = () => (seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648;
    for (let i = 0; i < 500; i++) {
      const bias = random();
      const { state, levels } = run(() => random() < bias);
      expect(isFinished(state)).toBe(true);
      expect(levels.length).toBeLessThanOrEqual(MAX_ITEMS);
      expect(itemsAnswered(state)).toBe(levels.length);
    }
  });

  it("ignores answers after it finishes", () => {
    const done = run(() => false).state;
    expect(recordAnswer(done, true)).toBe(done);
  });
});

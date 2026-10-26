import { describe, expect, it } from "vitest";
import { createRng, pick, randomInt, shuffle } from "./random";

describe("createRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(seqA);
  });

  it("gives a different sequence for a different seed", () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });

  it("stays within [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("helpers", () => {
  it("randomInt stays within [0, n)", () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) expect(randomInt(rng, 4)).toBeLessThan(4);
  });

  it("shuffle keeps every item and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, createRng(9));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(input);
  });

  it("pick returns an item of the list", () => {
    expect(["a", "b"]).toContain(pick(["a", "b"], createRng(5)));
  });
});

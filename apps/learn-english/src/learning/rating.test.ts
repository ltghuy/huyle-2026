import { describe, expect, it } from "vitest";
import { rate, type RateInput } from "./rating";

const base: RateInput = { correct: true, ms: 2000, hinted: false, typo: false, selfMarked: false };

describe("rate", () => {
  it("rates a wrong answer Again", () => {
    expect(rate({ ...base, correct: false })).toBe("again");
    expect(rate({ ...base, correct: false, hinted: true, ms: 20_000 })).toBe("again");
  });

  it("rates a fast clean correct answer Good", () => {
    expect(rate(base)).toBe("good");
    expect(rate({ ...base, ms: 8000 })).toBe("good");
  });

  it("rates a slow, hinted or typo answer Hard", () => {
    expect(rate({ ...base, ms: 8001 })).toBe("hard");
    expect(rate({ ...base, hinted: true })).toBe("hard");
    expect(rate({ ...base, typo: true })).toBe("hard");
  });

  it("maps self-marked answers to Good or Again", () => {
    expect(rate({ ...base, selfMarked: true, ms: 60_000 })).toBe("good");
    expect(rate({ ...base, selfMarked: true, correct: false })).toBe("again");
  });

  it("never produces Easy", () => {
    const seen = new Set<string>();
    for (const correct of [true, false])
      for (const hinted of [true, false])
        for (const typo of [true, false])
          for (const selfMarked of [true, false])
            for (const ms of [0, 500, 8000, 8001, 60_000]) seen.add(rate({ correct, hinted, typo, selfMarked, ms }));
    expect([...seen].sort()).toEqual(["again", "good", "hard"]);
  });
});

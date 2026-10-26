import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { buildSentenceGap, gradeSentenceGap } from "./sentence-gap";

const s = sentence("homework", { tokens: ["She", "does", "her", "homework", "every", "day"], gapCandidates: [1, 3] });
const distractorWords = ["makes", "Homework", "book", "takes", "", "book", "lesson"];

describe("buildSentenceGap", () => {
  it("blanks one gap candidate", () => {
    for (let seed = 0; seed < 20; seed++) {
      const ex = buildSentenceGap({ sentence: s, distractorWords }, seed)!;
      expect([1, 3]).toContain(ex.gapIndex);
      expect(ex.display[ex.gapIndex]).toBeNull();
      expect(ex.display.filter((t) => t === null)).toHaveLength(1);
      expect(ex.answer).toBe(s.body.tokens[ex.gapIndex]);
    }
  });

  it("offers the answer plus 3 distinct distractors", () => {
    for (let seed = 0; seed < 20; seed++) {
      const ex = buildSentenceGap({ sentence: s, distractorWords }, seed)!;
      expect(ex.options).toHaveLength(4);
      const forms = ex.options!.map((o) => o.toLowerCase());
      expect(new Set(forms).size).toBe(4);
      expect(forms.filter((f) => f === ex.answer.toLowerCase())).toHaveLength(1);
    }
  });

  it("drops the options when there are too few distractors", () => {
    expect(buildSentenceGap({ sentence: s, distractorWords: ["book"] }, 1)!.options).toBeNull();
  });

  it("returns null without gap candidates", () => {
    expect(buildSentenceGap({ sentence: sentence("x", { tokens: ["Hi", "there"] }), distractorWords }, 1)).toBeNull();
  });

  it("is deterministic per seed and varies across seeds", () => {
    const build = (seed: number) => buildSentenceGap({ sentence: s, distractorWords }, seed);
    expect(build(3)).toEqual(build(3));
    expect(new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(build(i)))).size).toBeGreaterThan(1);
  });
});

describe("gradeSentenceGap", () => {
  it("compares after normalizing", () => {
    const ex = buildSentenceGap({ sentence: s, distractorWords }, 1)!;
    expect(gradeSentenceGap(ex, ` ${ex.answer.toUpperCase()} `)).toEqual({ correct: true, expected: ex.answer });
    expect(gradeSentenceGap(ex, "book").correct).toBe(false);
    expect(gradeSentenceGap(ex, "").correct).toBe(false);
  });
});

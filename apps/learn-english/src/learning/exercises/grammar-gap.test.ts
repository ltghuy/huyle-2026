import { describe, expect, it } from "vitest";
import { grammar } from "./fixtures";
import { buildGrammarGap, gradeGrammarGap } from "./grammar-gap";

const choice = {
  prompt: "She ___ to school every day.",
  options: ["go", "goes", "going", "gone"],
  answer: "goes",
  explanationVi: "Chủ ngữ số ít dùng động từ thêm -s.",
};
const typed = { prompt: "They ___ (play) football now.", answer: "are playing", explanationVi: "Hiện tại tiếp diễn." };

describe("buildGrammarGap", () => {
  it("builds a multiple choice when the item has options", () => {
    const ex = buildGrammarGap({ grammar: grammar("present-simple", [choice]) }, 1)!;
    expect(ex.mode).toBe("choice");
    if (ex.mode !== "choice") return;
    expect([...ex.options].sort()).toEqual([...choice.options].sort());
    expect(ex.options[ex.answerIndex]).toBe("goes");
  });

  it("asks to type when the item has no options", () => {
    expect(buildGrammarGap({ grammar: grammar("present-continuous", [typed]) }, 1)!.mode).toBe("type");
  });

  it("returns null for a topic without practice", () => {
    expect(buildGrammarGap({ grammar: grammar("empty", []) }, 1)).toBeNull();
  });

  it("is deterministic per seed and varies across seeds", () => {
    const topic = grammar("mixed", [choice, typed]);
    expect(buildGrammarGap({ grammar: topic }, 3)).toEqual(buildGrammarGap({ grammar: topic }, 3));
    const picks = new Set(Array.from({ length: 20 }, (_, s) => buildGrammarGap({ grammar: topic }, s)!.practiceIndex));
    expect(picks.size).toBe(2);
  });
});

describe("gradeGrammarGap", () => {
  it("grades a choice by index and explains a wrong answer", () => {
    const ex = buildGrammarGap({ grammar: grammar("g", [choice]) }, 2)!;
    if (ex.mode !== "choice") throw new Error("expected a choice");
    expect(gradeGrammarGap(ex, ex.answerIndex)).toEqual({ correct: true, expected: "goes" });
    expect(gradeGrammarGap(ex, (ex.answerIndex + 1) % 4)).toEqual({
      correct: false,
      expected: "goes",
      explanationVi: choice.explanationVi,
    });
  });

  it("compares a typed answer after normalizing", () => {
    const ex = buildGrammarGap({ grammar: grammar("g", [typed]) }, 1)!;
    expect(gradeGrammarGap(ex, "  Are   PLAYING ").correct).toBe(true);
    expect(gradeGrammarGap(ex, "play").correct).toBe(false);
    expect(gradeGrammarGap(ex, "").correct).toBe(false);
  });
});

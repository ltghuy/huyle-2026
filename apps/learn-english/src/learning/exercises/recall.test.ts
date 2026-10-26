import { describe, expect, it } from "vitest";
import { word } from "./fixtures";
import { buildRecall, damerauLevenshtein, gradeRecall } from "./recall";

const ex = buildRecall({ target: word("color", { variants: ["colour"], meaningsVi: ["màu sắc"] }) });

describe("buildRecall", () => {
  it("prompts with the Vietnamese meanings", () => {
    expect(ex.meaningsVi).toEqual(["màu sắc"]);
    expect(ex.headword).toBe("color");
  });
});

describe("damerauLevenshtein", () => {
  it.each([
    ["color", "color", 0],
    ["colr", "color", 1],
    ["coloor", "color", 1],
    ["colpr", "color", 1],
    ["cloor", "color", 1],
    ["clr", "color", 2],
    ["", "abc", 3],
  ])("%s ↔ %s = %i", (a, b, distance) => {
    expect(damerauLevenshtein(a, b)).toBe(distance);
  });
});

describe("gradeRecall", () => {
  it("accepts the headword and variants, loosely", () => {
    expect(gradeRecall(ex, " COLOR ")).toEqual({ correct: true, expected: "color" });
    expect(gradeRecall(ex, "colour")).toEqual({ correct: true, expected: "color" });
  });

  it("accepts one slip in a 5+ letter word as a typo", () => {
    for (const slip of ["colr", "coloor", "cloor", "colpr"]) {
      expect(gradeRecall(ex, slip)).toEqual({ correct: true, typo: true, expected: "color" });
    }
  });

  it("rejects two slips, an empty answer, and slips in short words", () => {
    expect(gradeRecall(ex, "clr").correct).toBe(false);
    expect(gradeRecall(ex, "").correct).toBe(false);
    const cat = buildRecall({ target: word("cat") });
    expect(gradeRecall(cat, "cta")).toEqual({ correct: false, expected: "cat" });
  });
});

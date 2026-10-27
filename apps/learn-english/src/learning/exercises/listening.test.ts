import { describe, expect, it } from "vitest";
import { word } from "./fixtures";
import {
  buildListeningChoice,
  buildListeningTyping,
  gradeListeningChoice,
  gradeListeningTyping,
} from "./listening";

const target = word("color", { variants: ["colour"] });
const pool = [
  word("colour"), // same word, other spelling
  word("collar"),
  word("cold"),
  word("comb"),
  word("elephant"),
  word("banana"),
];

describe("buildListeningChoice", () => {
  it("offers 4 distinct words with the target exactly once", () => {
    for (let seed = 0; seed < 30; seed++) {
      const ex = buildListeningChoice({ target, pool }, seed)!;
      expect(ex.options).toHaveLength(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options.filter((o) => o === "color")).toHaveLength(1);
      expect(ex.options[ex.answerIndex]).toBe("color");
      expect(ex.options).not.toContain("colour");
    }
  });

  it("prefers look-alike words", () => {
    const ex = buildListeningChoice({ target, pool }, 1)!;
    expect([...ex.options].sort()).toEqual(["cold", "collar", "color", "comb"]);
  });

  it("carries the IPA and meanings to show after checking", () => {
    const withIpa = word("color", { variants: ["colour"], ipa: "ˈkʌlər", meaningsVi: ["màu sắc"] });
    expect(buildListeningChoice({ target: withIpa, pool }, 1)).toMatchObject({ ipa: "ˈkʌlər", meaningsVi: ["màu sắc"] });
    expect(buildListeningTyping({ target: withIpa })).toMatchObject({ ipa: "ˈkʌlər", meaningsVi: ["màu sắc"] });
  });

  it("returns null without enough distractors", () => {
    expect(buildListeningChoice({ target, pool: pool.slice(0, 3) }, 1)).toBeNull();
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(buildListeningChoice({ target, pool }, 4)).toEqual(buildListeningChoice({ target, pool }, 4));
    const orders = new Set(Array.from({ length: 20 }, (_, s) => buildListeningChoice({ target, pool }, s)!.answerIndex));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe("grading", () => {
  it("grades the choice by index", () => {
    const ex = buildListeningChoice({ target, pool }, 2)!;
    expect(gradeListeningChoice(ex, ex.answerIndex)).toEqual({ correct: true, expected: "color" });
    expect(gradeListeningChoice(ex, (ex.answerIndex + 1) % 4).correct).toBe(false);
  });

  it("accepts the headword or a variant when typed", () => {
    const ex = buildListeningTyping({ target });
    expect(gradeListeningTyping(ex, " Color ").correct).toBe(true);
    expect(gradeListeningTyping(ex, "colour").correct).toBe(true);
    expect(gradeListeningTyping(ex, "collar")).toEqual({ correct: false, expected: "color" });
  });
});

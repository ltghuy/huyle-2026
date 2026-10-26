import { describe, expect, it } from "vitest";
import { buildChooseSentence, gradeChooseSentence } from "./choose-sentence";
import { sentence } from "./fixtures";

const wrongVariants = [
  { en: "She go to school.", explanationVi: "Chủ ngữ số ít: goes." },
  { en: "She going to school.", explanationVi: "Thiếu động từ to be." },
  { en: "She goes at school.", explanationVi: "Dùng to, không dùng at." },
  { en: "She gone to school.", explanationVi: "Gone là quá khứ phân từ." },
  { en: "She goes to school.", explanationVi: "trùng với câu đúng" },
];
const s = sentence("school", { tokens: ["She", "goes", "to", "school"], en: "She goes to school.", wrongVariants });

describe("buildChooseSentence", () => {
  it("offers 4 distinct sentences with exactly one correct", () => {
    for (let seed = 0; seed < 30; seed++) {
      const ex = buildChooseSentence({ sentence: s }, seed)!;
      expect(ex.options).toHaveLength(4);
      expect(new Set(ex.options.map((o) => o.text)).size).toBe(4);
      expect(ex.options.filter((o) => o.text === "She goes to school.")).toHaveLength(1);
      expect(ex.options[ex.answerIndex].text).toBe("She goes to school.");
      expect(ex.options.filter((o) => o.explanationVi === undefined)).toHaveLength(1);
    }
  });

  it("returns null with fewer than 3 usable wrong variants", () => {
    const few = sentence("few", {
      tokens: ["Hi", "there"],
      wrongVariants: [wrongVariants[0], wrongVariants[1], wrongVariants[1]],
    });
    expect(buildChooseSentence({ sentence: few }, 1)).toBeNull();
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(buildChooseSentence({ sentence: s }, 8)).toEqual(buildChooseSentence({ sentence: s }, 8));
    const variants = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(buildChooseSentence({ sentence: s }, i))),
    );
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("gradeChooseSentence", () => {
  it("accepts the correct sentence and explains a wrong pick", () => {
    const ex = buildChooseSentence({ sentence: s }, 2)!;
    expect(gradeChooseSentence(ex, ex.answerIndex)).toEqual({ correct: true, expected: "She goes to school." });
    const wrongIndex = (ex.answerIndex + 1) % 4;
    expect(gradeChooseSentence(ex, wrongIndex)).toEqual({
      correct: false,
      expected: "She goes to school.",
      explanationVi: ex.options[wrongIndex].explanationVi,
    });
  });
});

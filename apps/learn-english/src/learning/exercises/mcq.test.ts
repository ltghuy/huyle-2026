import { describe, expect, it } from "vitest";
import { word } from "./fixtures";
import { buildMcq, gradeMcq, type McqDirection } from "./mcq";

const target = word("big", { pos: "adjective", meaningsVi: ["to", "lớn"], synonyms: ["word:large"] });
const pool = [
  word("large", { pos: "adjective", meaningsVi: ["rộng lớn"] }), // listed synonym
  word("huge", { pos: "adjective", meaningsVi: ["khổng lồ"], synonyms: ["word:big"] }), // lists the target
  word("great", { pos: "adjective", meaningsVi: [" Lớn ", "tuyệt"] }), // shares a meaning
  word("small", { pos: "adjective", meaningsVi: ["nhỏ"] }),
  word("tall", { pos: "adjective", meaningsVi: ["cao"] }),
  word("old", { pos: "adjective", meaningsVi: ["già", "cũ"] }),
  word("new", { pos: "adjective", meaningsVi: ["mới"] }),
  word("run", { pos: "verb", meaningsVi: ["chạy"] }),
  word("tiny", { pos: "adjective", meaningsVi: ["nhỏ"] }), // same text as "small"
];
const excluded = ["word:large", "word:huge", "word:great"];

describe("buildMcq", () => {
  it.each<McqDirection>(["en-vi", "vi-en"])("has 4 distinct options with exactly one correct (%s)", (direction) => {
    for (let seed = 0; seed < 50; seed++) {
      const mcq = buildMcq({ target, pool, direction }, seed)!;
      expect(mcq.options).toHaveLength(4);
      expect(mcq.options.filter((o) => o.wordId === target.id)).toHaveLength(1);
      expect(mcq.options[mcq.answerIndex].wordId).toBe(target.id);
      expect(new Set(mcq.options.map((o) => o.text.trim().toLowerCase())).size).toBe(4);
    }
  });

  it("never offers synonyms or words sharing a meaning", () => {
    for (let seed = 0; seed < 50; seed++) {
      const ids = buildMcq({ target, pool }, seed)!.options.map((o) => o.wordId);
      for (const id of excluded) expect(ids).not.toContain(id);
    }
  });

  it("shows the headword in en-vi and a target meaning in vi-en", () => {
    const enVi = buildMcq({ target, pool, direction: "en-vi" }, 1)!;
    expect(enVi.prompt).toBe("big");
    expect(target.body.meaningsVi).toContain(enVi.options[enVi.answerIndex].text);
    const viEn = buildMcq({ target, pool, direction: "vi-en" }, 1)!;
    expect(target.body.meaningsVi).toContain(viEn.prompt);
    expect(viEn.options[viEn.answerIndex].text).toBe("big");
  });

  it("prefers the same part of speech", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(buildMcq({ target, pool }, seed)!.options.map((o) => o.wordId)).not.toContain("word:run");
    }
  });

  it("prefers the same or an adjacent level", () => {
    const levelled = [
      word("a", { pos: "adjective" }, "A2"),
      word("b", { pos: "adjective" }, "A1"),
      word("c", { pos: "adjective" }, "A2"),
      word("far", { pos: "adjective" }, "C1"),
    ];
    for (let seed = 0; seed < 30; seed++) {
      const ids = buildMcq({ target, pool: levelled }, seed)!.options.map((o) => o.wordId);
      expect(ids).not.toContain("word:far");
    }
  });

  it("picks the direction from the seed", () => {
    const directions = new Set(Array.from({ length: 20 }, (_, s) => buildMcq({ target, pool }, s)!.direction));
    expect(directions).toEqual(new Set(["en-vi", "vi-en"]));
  });

  it("returns null without enough distractors", () => {
    expect(buildMcq({ target, pool: pool.slice(0, 5) }, 1)).toBeNull();
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(buildMcq({ target, pool }, 7)).toEqual(buildMcq({ target, pool }, 7));
    const variants = new Set(Array.from({ length: 20 }, (_, s) => JSON.stringify(buildMcq({ target, pool }, s))));
    expect(variants.size).toBeGreaterThan(1);
  });

  it("returns the target's meanings for the explanation", () => {
    expect(buildMcq({ target, pool }, 3)!.explanationVi).toEqual(["to", "lớn"]);
  });
});

describe("gradeMcq", () => {
  it("accepts only the answer index", () => {
    const mcq = buildMcq({ target, pool, direction: "vi-en" }, 2)!;
    expect(gradeMcq(mcq, mcq.answerIndex)).toEqual({ correct: true, expected: "big" });
    expect(gradeMcq(mcq, (mcq.answerIndex + 1) % 4)).toEqual({ correct: false, expected: "big" });
  });
});

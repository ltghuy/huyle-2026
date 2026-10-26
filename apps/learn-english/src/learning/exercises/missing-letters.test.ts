import { describe, expect, it } from "vitest";
import { word } from "./fixtures";
import {
  buildMissingLetters,
  gradeMissingLetters,
  hiddenCount,
  letterChoices,
  maskedText,
} from "./missing-letters";

const build = (headword: string, seed = 1) => buildMissingLetters({ target: word("w", { headword }) }, seed);
const hidden = (headword: string, seed = 1) => build(headword, seed).cells.filter((c) => c.hidden).length;

describe("buildMissingLetters", () => {
  it("hides about 30% of the letters, at least 1", () => {
    expect(hidden("homework")).toBe(2); // round(2.4)
    expect(hidden("book")).toBe(1); // round(1.2)
    expect(hidden("information")).toBe(3); // round(3.3)
    expect(hiddenCount(5)).toBe(2); // round(1.5)
  });

  it("hides exactly 1 letter of words with 3 letters or fewer", () => {
    for (const w of ["cat", "go", "I", "o'k"]) {
      for (let seed = 0; seed < 20; seed++) expect(hidden(w, seed)).toBe(1);
    }
  });

  it("may hide the first letter of a short word", () => {
    const firsts = Array.from({ length: 40 }, (_, s) => build("cat", s).cells[0].hidden);
    expect(firsts).toContain(true);
  });

  it("never hides the first letter of a longer word", () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(build("homework", seed).cells[0].hidden).toBe(false);
      const phrase = build("look after", seed).cells;
      expect(phrase[0].hidden).toBe(false);
      expect(phrase[5].hidden).toBe(false);
    }
  });

  it("still hides a letter in a phrase of one-letter words, but not the first", () => {
    for (let seed = 0; seed < 20; seed++) {
      const ex = build("a b c d", seed);
      expect(ex.answer).toHaveLength(1);
      expect(ex.cells[0].hidden).toBe(false);
    }
  });

  it("never hides spaces, hyphens, apostrophes or dots", () => {
    for (const w of ["T-shirt", "o'clock", "a.m. class", "ice cream", "mother-in-law"]) {
      for (let seed = 0; seed < 50; seed++) {
        for (const cell of build(w, seed).cells) {
          if (cell.hidden) expect(cell.char).toMatch(/\p{L}/u);
        }
      }
    }
  });

  it("keeps the word's characters in order and lists the hidden letters", () => {
    const ex = build("homework", 3);
    expect(ex.cells.map((c) => c.char).join("")).toBe("homework");
    expect(ex.answer).toEqual(ex.cells.filter((c) => c.hidden).map((c) => c.char));
    expect(maskedText(ex)).toMatch(/^h[a-z_]{7}$/);
    expect(maskedText(ex).split("_")).toHaveLength(3);
  });

  it("is deterministic per seed and varies across seeds", () => {
    expect(build("homework", 9)).toEqual(build("homework", 9));
    const masks = new Set(Array.from({ length: 20 }, (_, s) => maskedText(build("homework", s))));
    expect(masks.size).toBeGreaterThan(1);
  });
});

describe("gradeMissingLetters", () => {
  const ex = build("homework", 4);

  it("accepts the hidden letters, case-insensitive", () => {
    expect(gradeMissingLetters(ex, ex.answer)).toEqual({ correct: true, expected: "homework" });
    expect(gradeMissingLetters(ex, ex.answer.map((l) => l.toUpperCase())).correct).toBe(true);
  });

  it("rejects a wrong or missing letter", () => {
    expect(gradeMissingLetters(ex, [ex.answer[0], "z"]).correct).toBe(false);
    expect(gradeMissingLetters(ex, [ex.answer[0]]).correct).toBe(false);
  });
});

describe("letterChoices", () => {
  it("offers the hidden letters plus 2–4 others", () => {
    const ex = build("information", 2);
    for (let seed = 0; seed < 20; seed++) {
      const tiles = letterChoices(ex, seed);
      const extra = tiles.length - ex.answer.length;
      expect(extra).toBeGreaterThanOrEqual(2);
      expect(extra).toBeLessThanOrEqual(4);
      for (const letter of ex.answer) expect(tiles).toContain(letter);
    }
    expect(letterChoices(ex, 5)).toEqual(letterChoices(ex, 5));
  });
});

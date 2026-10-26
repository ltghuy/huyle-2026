import { describe, expect, it } from "vitest";
import { hardWords } from "./hard-words";
import type { Attempt } from "./types";

let seq = 0;
/** Attempts for one item, oldest first: each entry is [correct, ms]. */
function history(itemId: string, answers: [boolean, number][]): Attempt[] {
  return answers.map(([correct, ms], i) => ({
    id: `id-${seq++}`,
    itemId,
    at: 1_000 + i * 60_000,
    correct,
    ms,
    hinted: false,
    typo: false,
    selfMarked: false,
    exercise: "recall",
    context: "review",
    rating: correct ? "good" : "again",
  }));
}

const R: [boolean, number] = [true, 2000];
const W: [boolean, number] = [false, 2000];
const SLOW: [boolean, number] = [true, 10_000];

describe("hardWords", () => {
  it("flags a word wrong in 3 of its last 8 attempts as often wrong", () => {
    const result = hardWords(history("word:a", [W, R, W, R, W, R]));
    expect(result).toEqual([expect.objectContaining({ itemId: "word:a", reason: "often-wrong" })]);
  });

  it("ignores mistakes older than the last 8 attempts", () => {
    expect(hardWords(history("word:a", [W, W, W, R, R, R, R, R, R, R, SLOW]))).toEqual([]);
    expect(hardWords(history("word:a", [W, W, R, R, R, W, R, SLOW]))).toHaveLength(1);
  });

  it("does not flag 2 wrong in the last 8", () => {
    expect(hardWords(history("word:a", [W, R, W, R, R, SLOW]))).toEqual([]);
  });

  it("flags an average over 8 s across the last 5 attempts as slow", () => {
    const result = hardWords(history("word:a", [SLOW, SLOW, SLOW, SLOW, [true, 5000]]));
    expect(result).toEqual([expect.objectContaining({ itemId: "word:a", reason: "slow" })]);
  });

  it("needs a full window of 5 for the slow rule", () => {
    expect(hardWords(history("word:a", [SLOW, SLOW, SLOW, SLOW]))).toEqual([]);
  });

  it("does not flag an average of exactly 8 s", () => {
    expect(hardWords(history("word:a", Array(5).fill([true, 8000])))).toEqual([]);
  });

  it("removes a word after 4 correct answers in a row under 5 s", () => {
    expect(hardWords(history("word:a", [W, W, W, R, R, R]))).toHaveLength(1);
    expect(hardWords(history("word:a", [W, W, W, R, R, R, R]))).toEqual([]);
    expect(hardWords(history("word:a", [W, W, W, R, R, R, [true, 5000]]))).toHaveLength(1);
  });

  it("uses attempt time, not input order", () => {
    const attempts = history("word:a", [W, W, W, R, R, R, R]).reverse();
    expect(hardWords(attempts)).toEqual([]);
  });

  it("only considers word items", () => {
    expect(hardWords(history("grammar:past-simple", [W, W, W, W]))).toEqual([]);
  });

  it("sorts hardest first: more mistakes, then slower", () => {
    const attempts = [
      ...history("word:slow", Array(5).fill(SLOW)),
      ...history("word:some", [W, W, W, R, R]),
      ...history("word:most", [W, W, W, W, W]),
    ];
    const result = hardWords(attempts);
    expect(result.map((h) => h.itemId)).toEqual(["word:most", "word:some", "word:slow"]);
    expect(result.map((h) => h.reason)).toEqual(["often-wrong", "often-wrong", "slow"]);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});

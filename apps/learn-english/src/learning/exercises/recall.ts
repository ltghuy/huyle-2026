// Meaning recall: Vietnamese meaning → type the English word. One slip
// (Damerau-Levenshtein distance 1) in a word of 5+ letters still counts, but
// is flagged as a typo so the rating becomes Hard.
import { matchesWord, normalize } from "../normalize";
import type { GradeResult, WordItem } from "./types";

export const TYPO_MIN_LENGTH = 5;

export interface RecallInstance {
  kind: "recall";
  targetId: string;
  meaningsVi: string[];
  pos: string;
  headword: string;
  variants: string[];
}

export function buildRecall(input: { target: WordItem }): RecallInstance {
  const { target } = input;
  return {
    kind: "recall",
    targetId: target.id,
    meaningsVi: [...target.body.meaningsVi],
    pos: target.body.pos,
    headword: target.body.headword,
    variants: [...target.body.variants],
  };
}

/** Optimal string alignment distance: edits, plus swaps of two neighbours. */
export function damerauLevenshtein(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  const d = Array.from({ length: x.length + 1 }, (_, i) =>
    Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[x.length][y.length];
}

export function gradeRecall(instance: RecallInstance, typed: string): GradeResult {
  const expected = instance.headword;
  if (matchesWord(typed, instance.headword, instance.variants)) return { correct: true, expected };
  const answer = normalize(typed);
  const typo =
    answer !== "" &&
    [instance.headword, ...instance.variants].some((form) => {
      const target = normalize(form);
      return [...target].length >= TYPO_MIN_LENGTH && damerauLevenshtein(answer, target) === 1;
    });
  return typo ? { correct: true, typo: true, expected } : { correct: false, expected };
}

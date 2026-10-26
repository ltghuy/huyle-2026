import type { RatingName } from "./types";

/** Above this response time a correct answer counts as a slow recall. */
export const SLOW_MS = 8000;

export interface RateInput {
  correct: boolean;
  ms: number;
  hinted: boolean;
  typo: boolean;
  selfMarked: boolean;
}

// Never "easy": Hard is only for a correct but effortful answer.
export function rate({ correct, ms, hinted, typo, selfMarked }: RateInput): RatingName {
  if (!correct) return "again";
  if (selfMarked) return "good";
  if (hinted || typo || ms > SLOW_MS) return "hard";
  return "good";
}

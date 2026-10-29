// Types shared by the exercise generators.
import type { ContentItemOf } from "../../content/schema";

export type WordItem = ContentItemOf<"word">;
export type GrammarItem = ContentItemOf<"grammar">;
export type SentenceItem = ContentItemOf<"sentence">;

/** What every grader returns. */
export interface GradeResult {
  correct: boolean;
  /** Accepted with one slip (recall); the rating maps it to Hard. */
  typo?: boolean;
  /** A hint was used before checking (dictation's Vietnamese meaning); the rating maps it to Hard. */
  hinted?: boolean;
  /** The right answer, to show after grading. */
  expected: string;
  /** Short Vietnamese explanation of the mistake, when the content has one. */
  explanationVi?: string;
}

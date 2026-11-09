// Types shared by the exercise generators.
import type { ContentItemOf } from "../../content/schema";
import type { WritingReview } from "./writing-ai";

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
  /** Set by the runner, never a grader: the learner claimed a wrong answer is also correct (feature 016). */
  claimed?: boolean;
  /** Set by the runner: AI grading with the learner's own key made the verdict (feature 033). */
  aiGraded?: boolean;
  /** Set by the runner: AI grading was tried but no key could answer, so matching decided (feature 033). */
  aiUnavailable?: boolean;
  /** Set by the runner: the AI's review of a "Bài viết" paragraph (feature 036); `aiGraded` is set too. */
  writingReview?: WritingReview;
}

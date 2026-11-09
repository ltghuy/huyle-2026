import type { GradeResult } from "@/learning/exercises/types";

/** Props every exercise renderer receives from the runner. */
export interface ExerciseViewProps<Instance, Answer> {
  instance: Instance;
  /** The learner's current answer; null until it is complete enough to check. */
  answer: Answer | null;
  onAnswer: (answer: Answer | null) => void;
  /** Set once the answer has been checked; renderers then lock and show the outcome. */
  result: GradeResult | null;
  /** Seed for presentation-only randomness (e.g. letter tiles). */
  seed: number;
  /** Lets the runner swap a listening exercise when its audio fails. */
  onAudioError?: () => void;
  /** Set only while a wrong answer can be claimed as also correct (feature 016). */
  onClaim?: () => void;
  /** True while AI grading is deciding the answer (feature 033); renderers keep the answer locked. */
  checking?: boolean;
  /** Set once an AI review was tried and no key could answer (feature 036): the view falls back to its own check. */
  aiUnavailable?: boolean;
}

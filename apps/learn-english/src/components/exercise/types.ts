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
}

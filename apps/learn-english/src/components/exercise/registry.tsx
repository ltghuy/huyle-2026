import type { ComponentType } from "react";
import { gradeGrammarGap, type GrammarGapInstance } from "@/learning/exercises/grammar-gap";
import {
  gradeListeningChoice,
  gradeListeningTyping,
  type ListeningChoiceInstance,
  type ListeningTypingInstance,
} from "@/learning/exercises/listening";
import { gradeMcq, type McqInstance } from "@/learning/exercises/mcq";
import { gradeMissingLetters, type MissingLettersInstance } from "@/learning/exercises/missing-letters";
import { gradeRecall, type RecallInstance } from "@/learning/exercises/recall";
import type { GradeResult } from "@/learning/exercises/types";
import type { ExerciseKind } from "@/learning/types";
import type { ExerciseViewProps } from "./types";
import {
  GrammarGapView,
  ListeningChoiceView,
  ListeningTypingView,
  McqView,
  MissingLettersView,
  RecallView,
} from "./word-exercises";

/** Any exercise instance the runner can show. */
export type ExerciseInstance =
  | McqInstance
  | ListeningChoiceInstance
  | ListeningTypingInstance
  | MissingLettersInstance
  | RecallInstance
  | GrammarGapInstance;

interface Entry<I, A> {
  exercise: ExerciseKind;
  View: ComponentType<ExerciseViewProps<I, A>>;
  grade: (instance: I, answer: A) => GradeResult;
}

// Each entry pairs a renderer with its grader; `entryFor` picks by kind and mode.
const entry = <I, A>(value: Entry<I, A>) => value as unknown as Entry<ExerciseInstance, unknown>;

export function entryFor(instance: ExerciseInstance): Entry<ExerciseInstance, unknown> {
  switch (instance.kind) {
    case "mcq":
      return entry({ exercise: "mcq", View: McqView, grade: gradeMcq });
    case "listening":
      return instance.mode === "choice"
        ? entry({ exercise: "listening", View: ListeningChoiceView, grade: gradeListeningChoice })
        : entry({ exercise: "listening", View: ListeningTypingView, grade: gradeListeningTyping });
    case "missing-letters":
      return entry({ exercise: "missing-letters", View: MissingLettersView, grade: gradeMissingLetters });
    case "recall":
      return entry({ exercise: "recall", View: RecallView, grade: gradeRecall });
    case "grammar-gap":
      return entry({ exercise: "grammar-gap", View: GrammarGapView, grade: gradeGrammarGap });
  }
}

/** Item the exercise trains, for attempts and the review schedule. */
export function itemIdOf(instance: ExerciseInstance): string {
  return instance.kind === "grammar-gap" ? instance.grammarId : instance.targetId;
}

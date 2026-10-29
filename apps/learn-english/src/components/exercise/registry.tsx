import type { ComponentType } from "react";
import { gradeChooseSentence, type ChooseSentenceInstance } from "@/learning/exercises/choose-sentence";
import {
  gradeFormsGap,
  gradeFormsListening,
  gradeFormsTyping,
  type FormsGapInstance,
  type FormsListeningInstance,
  type FormsTypingInstance,
} from "@/learning/exercises/forms";
import { gradeDictation, type DictationInstance } from "@/learning/exercises/dictation";
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
import { gradeSentenceGap, type SentenceGapInstance } from "@/learning/exercises/sentence-gap";
import { gradeTileTranslate, type TileTranslateInstance } from "@/learning/exercises/tile-translate";
import { gradeWordOrder, type WordOrderInstance } from "@/learning/exercises/word-order";
import type { GradeResult } from "@/learning/exercises/types";
import type { ExerciseKind } from "@/learning/types";
import {
  ChooseSentenceView,
  gradeWriting,
  SentenceGapView,
  TileTranslateView,
  WordOrderView,
  WritingView,
  type WritingInstance,
} from "./sentence-exercises";
import { FormsGapView, FormsListeningView, FormsTypingView } from "./forms-exercises";
import { DictationView } from "./dictation-exercise";
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
  | GrammarGapInstance
  | WordOrderInstance
  | TileTranslateInstance
  | SentenceGapInstance
  | ChooseSentenceInstance
  | WritingInstance
  | DictationInstance
  | FormsTypingInstance
  | FormsGapInstance
  | FormsListeningInstance;

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
    case "word-order":
      return entry({ exercise: "word-order", View: WordOrderView, grade: gradeWordOrder });
    case "tile-translate":
      return entry({ exercise: "tile-translate", View: TileTranslateView, grade: gradeTileTranslate });
    case "sentence-gap":
      return entry({ exercise: "sentence-gap", View: SentenceGapView, grade: gradeSentenceGap });
    case "choose-sentence":
      return entry({ exercise: "choose-sentence", View: ChooseSentenceView, grade: gradeChooseSentence });
    case "writing":
      return entry({ exercise: "writing", View: WritingView, grade: gradeWriting });
    case "dictation":
      return entry({ exercise: "dictation", View: DictationView, grade: gradeDictation });
    case "forms-typing":
      return entry({ exercise: "forms-typing", View: FormsTypingView, grade: gradeFormsTyping });
    case "forms-gap":
      return entry({ exercise: "forms-gap", View: FormsGapView, grade: gradeFormsGap });
    case "forms-listening":
      return entry({ exercise: "forms-listening", View: FormsListeningView, grade: gradeFormsListening });
  }
}

/** Item the exercise trains, for attempts and the review schedule. */
export function itemIdOf(instance: ExerciseInstance): string {
  switch (instance.kind) {
    case "grammar-gap":
      return instance.grammarId;
    case "word-order":
    case "tile-translate":
    case "sentence-gap":
    case "choose-sentence":
    case "dictation":
      return instance.sentenceId;
    case "writing":
      return instance.writingId;
    default:
      return instance.targetId;
  }
}

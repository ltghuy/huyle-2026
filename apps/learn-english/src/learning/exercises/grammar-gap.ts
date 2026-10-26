// Grammar practice from a topic's `practice` items: a multiple choice when
// the item has options, otherwise the learner types the answer.
import { normalize } from "../normalize";
import { createRng, randomInt, shuffle } from "./random";
import type { GradeResult, GrammarItem } from "./types";

interface GrammarGapBase {
  kind: "grammar-gap";
  grammarId: string;
  practiceIndex: number;
  prompt: string;
  answer: string;
  explanationVi: string;
}

export interface GrammarGapChoice extends GrammarGapBase {
  mode: "choice";
  options: string[];
  answerIndex: number;
}

export interface GrammarGapTyping extends GrammarGapBase {
  mode: "type";
}

export type GrammarGapInstance = GrammarGapChoice | GrammarGapTyping;

/** A seeded practice item of the topic, or null when it has none. */
export function buildGrammarGap(input: { grammar: GrammarItem }, seed: number): GrammarGapInstance | null {
  const { grammar } = input;
  const { practice } = grammar.body;
  if (practice.length === 0) return null;
  const rng = createRng(seed);
  const practiceIndex = randomInt(rng, practice.length);
  const item = practice[practiceIndex];
  const base: GrammarGapBase = {
    kind: "grammar-gap",
    grammarId: grammar.id,
    practiceIndex,
    prompt: item.prompt,
    answer: item.answer,
    explanationVi: item.explanationVi,
  };
  const options = item.options ? shuffle(item.options, rng) : [];
  const answerIndex = options.findIndex((option) => normalize(option) === normalize(item.answer));
  // An item whose answer is missing from its options falls back to typing.
  if (answerIndex === -1) return { ...base, mode: "type" };
  return { ...base, mode: "choice", options, answerIndex };
}

/** `answer` is the chosen option index (choice) or the typed text (type). */
export function gradeGrammarGap(instance: GrammarGapInstance, answer: number | string): GradeResult {
  const correct =
    instance.mode === "choice"
      ? answer === instance.answerIndex
      : typeof answer === "string" && normalize(answer) !== "" && normalize(answer) === normalize(instance.answer);
  return correct
    ? { correct, expected: instance.answer }
    : { correct, expected: instance.answer, explanationVi: instance.explanationVi };
}

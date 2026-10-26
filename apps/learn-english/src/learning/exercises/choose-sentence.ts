// Choose the one correct sentence among 4 (AC-033): the sentence plus 3 of
// its reviewed wrong variants. A wrong pick returns that variant's
// Vietnamese explanation.
import { normalize } from "../normalize";
import { createRng, shuffle } from "./random";
import type { GradeResult, SentenceItem } from "./types";

export const CHOOSE_OPTIONS = 4;

export interface ChooseSentenceOption {
  text: string;
  /** Why this sentence is wrong; absent on the correct one. */
  explanationVi?: string;
}

export interface ChooseSentenceInstance {
  kind: "choose-sentence";
  sentenceId: string;
  options: ChooseSentenceOption[];
  answerIndex: number;
  vi: string;
  audio: string;
}

export function buildChooseSentence(input: { sentence: SentenceItem }, seed: number): ChooseSentenceInstance | null {
  const { sentence } = input;
  const { body } = sentence;
  const seen = new Set([normalize(body.en)]);
  const wrong = body.wrongVariants.filter((variant) => {
    const form = normalize(variant.en);
    if (seen.has(form)) return false;
    seen.add(form);
    return true;
  });
  if (wrong.length < CHOOSE_OPTIONS - 1) return null;

  const rng = createRng(seed);
  const correct: ChooseSentenceOption = { text: body.en };
  const distractors = shuffle(wrong, rng)
    .slice(0, CHOOSE_OPTIONS - 1)
    .map((variant) => ({ text: variant.en, explanationVi: variant.explanationVi }));
  const options = shuffle([correct, ...distractors], rng);
  return {
    kind: "choose-sentence",
    sentenceId: sentence.id,
    options,
    answerIndex: options.indexOf(correct),
    vi: body.vi,
    audio: body.audio,
  };
}

export function gradeChooseSentence(instance: ChooseSentenceInstance, chosenIndex: number): GradeResult {
  const expected = instance.options[instance.answerIndex].text;
  if (chosenIndex === instance.answerIndex) return { correct: true, expected };
  const explanationVi = instance.options[chosenIndex]?.explanationVi;
  return explanationVi === undefined ? { correct: false, expected } : { correct: false, expected, explanationVi };
}

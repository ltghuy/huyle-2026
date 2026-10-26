// Fill in the missing word (AC-033): one of the sentence's gap candidates is
// blanked; the learner types it or picks it among 4 words.
import { normalize } from "../normalize";
import { createRng, pick, shuffle } from "./random";
import type { GradeResult, SentenceItem } from "./types";

export const GAP_OPTIONS = 4;

export interface SentenceGapInstance {
  kind: "sentence-gap";
  sentenceId: string;
  /** The tokens with `null` at the gap. */
  display: (string | null)[];
  gapIndex: number;
  answer: string;
  /** The answer plus 3 distractors, shuffled; null when there are not enough distractors (typing only). */
  options: string[] | null;
  en: string;
  vi: string;
  audio: string;
}

export interface SentenceGapInput {
  sentence: SentenceItem;
  /** Headwords of same-level words to use as distractors. */
  distractorWords: readonly string[];
}

export function buildSentenceGap(input: SentenceGapInput, seed: number): SentenceGapInstance | null {
  const { sentence, distractorWords } = input;
  const { body } = sentence;
  if (body.gapCandidates.length === 0) return null;
  const rng = createRng(seed);
  const gapIndex = pick(body.gapCandidates, rng);
  const answer = body.tokens[gapIndex];

  const seen = new Set([normalize(answer)]);
  const distractors: string[] = [];
  for (const candidate of shuffle(distractorWords, rng)) {
    if (distractors.length === GAP_OPTIONS - 1) break;
    const form = normalize(candidate);
    if (form === "" || seen.has(form)) continue;
    seen.add(form);
    distractors.push(candidate);
  }

  return {
    kind: "sentence-gap",
    sentenceId: sentence.id,
    display: body.tokens.map((token, i) => (i === gapIndex ? null : token)),
    gapIndex,
    answer,
    options: distractors.length === GAP_OPTIONS - 1 ? shuffle([answer, ...distractors], rng) : null,
    en: body.en,
    vi: body.vi,
    audio: body.audio,
  };
}

/** `answer` is the typed or picked word. */
export function gradeSentenceGap(instance: SentenceGapInstance, answer: string): GradeResult {
  const typed = normalize(answer);
  return { correct: typed !== "" && typed === normalize(instance.answer), expected: instance.answer };
}

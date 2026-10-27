// Multiple choice on a word's meaning (AC-028): English word → 4 Vietnamese
// meanings, or a Vietnamese meaning → 4 English words. Exactly one option is
// correct: synonyms and words that share a meaning are never distractors.
import { LEVELS } from "../types";
import { createRng, pick, randomInt, shuffle } from "./random";
import type { GradeResult, WordItem } from "./types";

export const MCQ_OPTIONS = 4;

export type McqDirection = "en-vi" | "vi-en";

export interface McqOption {
  text: string;
  wordId: string;
}

export interface McqInstance {
  kind: "mcq";
  targetId: string;
  direction: McqDirection;
  /** The English headword ("en-vi") or one Vietnamese meaning ("vi-en"). */
  prompt: string;
  options: McqOption[];
  answerIndex: number;
  /** The target's meanings, for the explanation shown after answering. */
  explanationVi: string[];
  /** The target word's clip, played once after a right answer; empty if none. */
  audio: string;
}

export interface McqInput {
  target: WordItem;
  /** Other words to draw distractors from (the target itself is skipped). */
  pool: readonly WordItem[];
  /** Fix the direction instead of letting the seed pick it. */
  direction?: McqDirection;
}

const key = (text: string) => text.trim().toLowerCase();

/** True when `other` could also be a right answer for `target`. */
function overlaps(target: WordItem, other: WordItem): boolean {
  if (other.id === target.id) return true;
  if (target.body.synonyms.includes(other.id) || other.body.synonyms.includes(target.id)) return true;
  const forms = new Set([target.body.headword, ...target.body.variants].map(key));
  if (forms.has(key(other.body.headword))) return true;
  const meanings = new Set(target.body.meaningsVi.map(key));
  return other.body.meaningsVi.some((m) => meanings.has(key(m)));
}

/** Lower is better: same part of speech, then same or adjacent level. */
function distractorScore(target: WordItem, other: WordItem): number {
  const pos = other.body.pos === target.body.pos ? 0 : 2;
  const gap = Math.abs(LEVELS.indexOf(other.level) - LEVELS.indexOf(target.level));
  return pos + (gap === 0 ? 0 : gap === 1 ? 1 : 3);
}

export function buildMcq(input: McqInput, seed: number): McqInstance | null {
  const { target, pool } = input;
  const rng = createRng(seed);
  const direction = input.direction ?? (randomInt(rng, 2) === 0 ? "en-vi" : "vi-en");
  const meaning = pick(target.body.meaningsVi, rng);
  const optionText = (word: WordItem, isTarget: boolean) =>
    direction === "vi-en" ? word.body.headword : isTarget ? meaning : pick(word.body.meaningsVi, rng);

  // Shuffle first so ties in score are broken by the seed; sort is stable.
  const candidates = shuffle(
    pool.filter((other) => !overlaps(target, other)),
    rng,
  ).sort((a, b) => distractorScore(target, a) - distractorScore(target, b));

  const correct: McqOption = { text: optionText(target, true), wordId: target.id };
  const options: McqOption[] = [correct];
  const seen = new Set([key(correct.text)]);
  for (const other of candidates) {
    if (options.length === MCQ_OPTIONS) break;
    const text = optionText(other, false);
    if (seen.has(key(text))) continue;
    seen.add(key(text));
    options.push({ text, wordId: other.id });
  }
  if (options.length < MCQ_OPTIONS) return null;

  const shuffled = shuffle(options, rng);
  return {
    kind: "mcq",
    targetId: target.id,
    direction,
    prompt: direction === "en-vi" ? target.body.headword : meaning,
    options: shuffled,
    answerIndex: shuffled.indexOf(correct),
    explanationVi: [...target.body.meaningsVi],
    audio: target.body.audio,
  };
}

export function gradeMcq(instance: McqInstance, chosenIndex: number): GradeResult {
  return {
    correct: chosenIndex === instance.answerIndex,
    expected: instance.options[instance.answerIndex].text,
  };
}

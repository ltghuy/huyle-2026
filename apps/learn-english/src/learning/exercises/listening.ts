// Listening: hear the word, then pick it among 4 written words or type it.
// Choice distractors look alike (same first letter, similar length) so the
// learner has to listen, not just recognise the shape.
import { matchesWord, normalize } from "../normalize";
import { createRng, shuffle } from "./random";
import type { GradeResult, WordItem } from "./types";

export const LISTENING_OPTIONS = 4;

export interface ListeningChoiceInstance {
  kind: "listening";
  mode: "choice";
  targetId: string;
  audio: string;
  options: string[];
  answerIndex: number;
  meaningsVi: string[];
}

export interface ListeningTypingInstance {
  kind: "listening";
  mode: "type";
  targetId: string;
  audio: string;
  headword: string;
  variants: string[];
  meaningsVi: string[];
}

/** Lower is better: same first letter, then close in length. */
function lookalikeScore(target: string, other: string): number {
  const first = target[0] === other[0] ? 0 : 2;
  return first + Math.min(Math.abs(target.length - other.length), 3);
}

export function buildListeningChoice(
  input: { target: WordItem; pool: readonly WordItem[] },
  seed: number,
): ListeningChoiceInstance | null {
  const { target, pool } = input;
  const rng = createRng(seed);
  const answer = target.body.headword;
  const seen = new Set([answer, ...target.body.variants].map(normalize));
  const headword = normalize(answer);

  const candidates = shuffle(
    pool.filter((other) => other.id !== target.id),
    rng,
  ).sort(
    (a, b) =>
      lookalikeScore(headword, normalize(a.body.headword)) - lookalikeScore(headword, normalize(b.body.headword)),
  );

  const options = [answer];
  for (const other of candidates) {
    if (options.length === LISTENING_OPTIONS) break;
    const form = normalize(other.body.headword);
    if (seen.has(form)) continue;
    seen.add(form);
    options.push(other.body.headword);
  }
  if (options.length < LISTENING_OPTIONS) return null;

  const shuffled = shuffle(options, rng);
  return {
    kind: "listening",
    mode: "choice",
    targetId: target.id,
    audio: target.body.audio,
    options: shuffled,
    answerIndex: shuffled.indexOf(answer),
    meaningsVi: [...target.body.meaningsVi],
  };
}

export function buildListeningTyping(input: { target: WordItem }): ListeningTypingInstance {
  const { target } = input;
  return {
    kind: "listening",
    mode: "type",
    targetId: target.id,
    audio: target.body.audio,
    headword: target.body.headword,
    variants: [...target.body.variants],
    meaningsVi: [...target.body.meaningsVi],
  };
}

export function gradeListeningChoice(instance: ListeningChoiceInstance, chosenIndex: number): GradeResult {
  return { correct: chosenIndex === instance.answerIndex, expected: instance.options[instance.answerIndex] };
}

/** Accepts the headword or a listed variant spelling (e.g. British). */
export function gradeListeningTyping(instance: ListeningTypingInstance, typed: string): GradeResult {
  return { correct: matchesWord(typed, instance.headword, instance.variants), expected: instance.headword };
}

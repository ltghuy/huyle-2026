// Fill the missing letters (AC-027): "ho_ewo_k" for "homework". About 30% of
// the letters are hidden (at least 1; exactly 1 for words of 3 letters or
// fewer). Spaces, hyphens, apostrophes and dots are never hidden, nor is the
// first letter of a word longer than 3 letters.
import { normalize } from "../normalize";
import { createRng, randomInt, shuffle } from "./random";
import type { GradeResult, WordItem } from "./types";

export const HIDDEN_SHARE = 0.3;

export interface LetterCell {
  char: string;
  hidden: boolean;
}

export interface MissingLettersInstance {
  kind: "missing-letters";
  targetId: string;
  headword: string;
  cells: LetterCell[];
  /** The hidden letters, left to right. */
  answer: string[];
  meaningsVi: string[];
  audio: string;
}

const isLetter = (char: string) => /\p{L}/u.test(char);

/** Indexes of letters that may be hidden. */
function hideable(headword: string, letterCount: number): number[] {
  const chars = [...headword];
  const letters = chars.flatMap((char, i) => (isLetter(char) ? [i] : []));
  if (letterCount <= 3) return letters;
  // Also keep the first letter of each word of a phrase ("look after") when
  // that still leaves something to hide; the entry's first letter always stays.
  const inner = letters.filter((i) => i > 0 && chars[i - 1] !== " ");
  return inner.length > 0 ? inner : letters.filter((i) => i > 0);
}

export function hiddenCount(letterCount: number): number {
  if (letterCount <= 3) return Math.min(1, letterCount);
  return Math.max(1, Math.round(letterCount * HIDDEN_SHARE));
}

export function buildMissingLetters(input: { target: WordItem }, seed: number): MissingLettersInstance {
  const { target } = input;
  const { headword } = target.body;
  const chars = [...headword];
  const letterCount = chars.filter(isLetter).length;
  const candidates = hideable(headword, letterCount);
  const rng = createRng(seed);
  const hidden = new Set(shuffle(candidates, rng).slice(0, hiddenCount(letterCount)));
  const cells = chars.map((char, i) => ({ char, hidden: hidden.has(i) }));
  return {
    kind: "missing-letters",
    targetId: target.id,
    headword,
    cells,
    answer: cells.filter((cell) => cell.hidden).map((cell) => cell.char),
    meaningsVi: [...target.body.meaningsVi],
    audio: target.body.audio,
  };
}

/** The word as shown, with "_" for each blank. */
export function maskedText(instance: MissingLettersInstance): string {
  return instance.cells.map((cell) => (cell.hidden ? "_" : cell.char)).join("");
}

/** Correct only when every blank holds the right letter (case-insensitive). */
export function gradeMissingLetters(instance: MissingLettersInstance, letters: readonly string[]): GradeResult {
  const correct =
    letters.length === instance.answer.length &&
    instance.answer.every((letter, i) => normalize(letters[i] ?? "") === normalize(letter));
  return { correct, expected: instance.headword };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/**
 * Letter tiles for tap-to-place (Telex typing can swallow letters): the hidden
 * letters plus 2–4 other letters, shuffled.
 */
export function letterChoices(instance: MissingLettersInstance, seed: number): string[] {
  const rng = createRng(seed);
  const answer = instance.answer.map((letter) => letter.toLowerCase());
  const others = shuffle(
    [...ALPHABET].filter((letter) => !answer.includes(letter)),
    rng,
  ).slice(0, 2 + randomInt(rng, 3));
  return shuffle([...answer, ...others], rng);
}

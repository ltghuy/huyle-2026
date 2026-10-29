// Find the error (feature 011), the exam's "underlined A–D" question. The
// sentence shown is one of the sentence's reviewed wrong variants, used only
// when it replaces one part of up to three words: that part is the error and
// the correct sentence gives its replacement. Three correct parts of the same
// length or so are underlined with it; they never touch the error, so fixing
// them could not also fix the sentence.
import { normalize } from "../normalize";
import { createRng, randomInt, shuffle, type Rng } from "./random";
import type { GradeResult, SentenceItem } from "./types";

export const FIND_ERROR_PARTS = 4;
const MAX_PART_WORDS = 3;

export interface FindErrorSegment {
  text: string;
  /** Index into `parts` when this segment is underlined. */
  part?: number;
}

export interface FindErrorInstance {
  kind: "find-error";
  sentenceId: string;
  /** The wrong sentence, split so the four parts can be underlined in place. */
  segments: FindErrorSegment[];
  /** The underlined parts in reading order (A–D). */
  parts: string[];
  answerIndex: number;
  /** What the error should be ("learning" → "learn"). */
  correction: string;
  explanationVi: string;
  en: string;
  vi: string;
  audio: string;
}

interface Word {
  text: string;
  start: number;
  end: number;
}

// A dotted abbreviation ("a.m.", "U.S.") is one word; otherwise letters and
// digits with apostrophes and hyphens inside ("don't", "well-known").
const WORD = /(?:\p{L}\.){2,}|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function wordsOf(text: string): Word[] {
  return [...text.matchAll(WORD)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
}

const keyOf = (text: string) => normalize(text);

/** A span of word indexes, end exclusive. */
interface Span {
  start: number;
  end: number;
}

interface Candidate {
  wrong: string;
  words: Word[];
  error: Span;
  correction: string;
  explanationVi: string;
}

/** The wrong variants that replace one part of 1–3 words, with that part located. */
function candidates(sentence: SentenceItem): Candidate[] {
  const right = wordsOf(sentence.body.en);
  return sentence.body.wrongVariants.flatMap((variant): Candidate[] => {
    const words = wordsOf(variant.en);
    let head = 0;
    while (head < Math.min(right.length, words.length) && keyOf(right[head].text) === keyOf(words[head].text)) head++;
    let tail = 0;
    while (tail < Math.min(right.length, words.length) - head && keyOf(right[right.length - 1 - tail].text) === keyOf(words[words.length - 1 - tail].text)) tail++;
    const fixed = right.slice(head, right.length - tail);
    const error = { start: head, end: words.length - tail };
    const errorLength = error.end - error.start;
    if (fixed.length === 0 || errorLength === 0 || fixed.length > MAX_PART_WORDS || errorLength > MAX_PART_WORDS) return [];
    const correction = sentence.body.en.slice(fixed[0].start, fixed[fixed.length - 1].end);
    return [{ wrong: variant.en, words, error, correction, explanationVi: variant.explanationVi }];
  });
}

const textOf = (candidate: Candidate, span: Span) => candidate.wrong.slice(candidate.words[span.start].start, candidate.words[span.end - 1].end);

/**
 * Three correct parts away from the error, `before` of them ahead of it, so
 * the error lands on letter `before`. The first pass keeps a word between
 * parts so the underlines read apart; short sentences fall back to letting
 * correct parts touch each other (never the error), then to single words.
 */
function correctParts(candidate: Candidate, before: number, rng: Rng): Span[] | null {
  const { error, words } = candidate;
  // The error and the words right next to it are off limits.
  const blocked = (i: number) => i >= error.start - 1 && i <= error.end;
  const longest = Math.min(MAX_PART_WORDS, error.end - error.start + 1);
  const order = shuffle(
    words.map((_, i) => i).filter((i) => !blocked(i)),
    rng,
  );
  for (const { gap, single } of [
    { gap: 1, single: false },
    { gap: 0, single: false },
    { gap: 0, single: true },
  ]) {
    const chosen: Span[] = [];
    const quota = { before, after: FIND_ERROR_PARTS - 1 - before };
    const texts = new Set([keyOf(textOf(candidate, error))]);
    const clashes = (span: Span) => chosen.some((other) => span.start < other.end + gap && other.start < span.end + gap);
    for (const start of order) {
      if (chosen.length === FIND_ERROR_PARTS - 1) break;
      const side = start < error.start ? "before" : "after";
      if (quota[side] === 0) continue;
      for (let length = single ? 1 : 1 + randomInt(rng, longest); length >= 1; length--) {
        const span = { start, end: start + length };
        if (span.end > words.length || clashes(span)) continue;
        if (Array.from({ length }, (_, k) => start + k).some(blocked)) continue;
        const text = keyOf(textOf(candidate, span));
        if (texts.has(text)) continue;
        texts.add(text);
        chosen.push(span);
        quota[side]--;
        break;
      }
    }
    if (chosen.length === FIND_ERROR_PARTS - 1) return chosen;
  }
  return null;
}

export function buildFindError(input: { sentence: SentenceItem }, seed: number): FindErrorInstance | null {
  const { sentence } = input;
  const rng = createRng(seed);
  // Letters are tried in random order, so the error isn't usually B or C just
  // because mistakes tend to sit mid-sentence.
  const attempts = shuffle(candidates(sentence), rng).flatMap((candidate) => shuffle([0, 1, 2, 3], rng).map((before) => ({ candidate, before })));
  for (const { candidate, before } of attempts) {
    const others = correctParts(candidate, before, rng);
    if (!others) continue;
    const spans = [candidate.error, ...others].sort((a, b) => a.start - b.start);
    const segments: FindErrorSegment[] = [];
    let at = 0;
    spans.forEach((span, part) => {
      const start = candidate.words[span.start].start;
      const end = candidate.words[span.end - 1].end;
      if (start > at) segments.push({ text: candidate.wrong.slice(at, start) });
      segments.push({ text: candidate.wrong.slice(start, end), part });
      at = end;
    });
    if (at < candidate.wrong.length) segments.push({ text: candidate.wrong.slice(at) });
    return {
      kind: "find-error",
      sentenceId: sentence.id,
      segments,
      parts: spans.map((span) => textOf(candidate, span)),
      answerIndex: spans.indexOf(candidate.error),
      correction: candidate.correction,
      explanationVi: candidate.explanationVi,
      en: sentence.body.en,
      vi: sentence.body.vi,
      audio: sentence.body.audio,
    };
  }
  return null;
}

/** True when some wrong variant of the sentence makes a find-the-error question. */
export function canFindError(sentence: SentenceItem): boolean {
  return buildFindError({ sentence }, 0) !== null;
}

export const PART_LETTERS = ["A", "B", "C", "D"] as const;

export function gradeFindError(instance: FindErrorInstance, chosenIndex: number): GradeResult {
  const expected = `(${PART_LETTERS[instance.answerIndex]}) ${instance.parts[instance.answerIndex]} → ${instance.correction}`;
  return { correct: chosenIndex === instance.answerIndex, expected };
}

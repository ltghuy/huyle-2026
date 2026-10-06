// Accent- and case-insensitive, all-words, literal search with highlight
// ranges mapped back to the original text.

import type { FaqEntry } from "@/server/practices/searchable-accordion/faq.schema";

/** Half-open range [start, end) in original-text indices. */
export type Range = readonly [number, number];

export type FoldedText = {
  folded: string;
  /** Original start index of each folded character. */
  starts: number[];
  /** Original end index of each folded character. */
  ends: number[];
};

export type IndexedEntry = {
  entry: FaqEntry;
  question: FoldedText;
  answer: FoldedText;
};

export type Snippet = {
  text: string;
  ranges: Range[];
  leadingEllipsis: boolean;
  trailingEllipsis: boolean;
};

export type Match = {
  questionRanges: Range[];
  answerRanges: Range[];
  /** Matched words occur only in the answer, not the question. */
  bodyOnly: boolean;
  snippet?: Snippet;
};

export const MAX_QUERY_LENGTH = 100;
const SNIPPET_CONTEXT = 40;
const MARKS = /\p{M}/gu;
const WHITESPACE = /\s+/;

function foldChar(ch: string) {
  return ch.normalize("NFD").replace(MARKS, "").toLowerCase();
}

/**
 * Folds one character at a time so every folded position maps back to the
 * original string, even when folding changes the length (é → e, İ → i).
 */
export function foldText(text: string): FoldedText {
  let folded = "";
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const ch of text) {
    const f = foldChar(ch);
    for (let k = 0; k < f.length; k++) {
      starts.push(index);
      ends.push(index + ch.length);
    }
    folded += f;
    index += ch.length;
  }
  return { folded, starts, ends };
}

export function indexEntries(entries: FaqEntry[]): IndexedEntry[] {
  return entries.map((entry) => ({
    entry,
    question: foldText(entry.question),
    answer: foldText(entry.answer),
  }));
}

/** Folded, de-duplicated words; empty means "match everything". */
export function parseQuery(query: string): string[] {
  const words = foldText(query.slice(0, MAX_QUERY_LENGTH))
    .folded.split(WHITESPACE)
    .filter(Boolean);
  return [...new Set(words)];
}

function occurrences(text: FoldedText, word: string): Range[] {
  const ranges: Range[] = [];
  let from = 0;
  for (;;) {
    const at = text.folded.indexOf(word, from);
    if (at === -1) break;
    ranges.push([text.starts[at], text.ends[at + word.length - 1]]);
    from = at + 1;
  }
  return ranges;
}

/** Sorts and merges ranges that overlap or touch. */
export function mergeRanges(ranges: Range[]): Range[] {
  const sorted = ranges.toSorted((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function makeSnippet(text: string, ranges: Range[]): Snippet | undefined {
  const first = ranges[0];
  if (!first) return undefined;
  let start = Math.max(0, first[0] - SNIPPET_CONTEXT);
  let end = Math.min(text.length, first[1] + SNIPPET_CONTEXT);
  // Widen the cut to word boundaries.
  if (start > 0) {
    const space = text.indexOf(" ", start);
    if (space !== -1 && space < first[0]) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(" ", end);
    if (space > first[1]) end = space;
  }
  return {
    text: text.slice(start, end),
    ranges: ranges
      .filter(([s, e]) => e > start && s < end)
      .map(([s, e]) => [Math.max(s, start) - start, Math.min(e, end) - start] as const),
    leadingEllipsis: start > 0,
    trailingEllipsis: end < text.length,
  };
}

/** Returns the match for an entry, or null when not every word occurs. */
export function matchEntry(ix: IndexedEntry, words: string[]): Match | null {
  if (words.length === 0) {
    return { questionRanges: [], answerRanges: [], bodyOnly: false };
  }
  const question: Range[] = [];
  const answer: Range[] = [];
  for (const word of words) {
    const q = occurrences(ix.question, word);
    const a = occurrences(ix.answer, word);
    if (q.length === 0 && a.length === 0) return null;
    question.push(...q);
    answer.push(...a);
  }
  const questionRanges = mergeRanges(question);
  const answerRanges = mergeRanges(answer);
  const bodyOnly = questionRanges.length === 0;
  return {
    questionRanges,
    answerRanges,
    bodyOnly,
    snippet: bodyOnly ? makeSnippet(ix.entry.answer, answerRanges) : undefined,
  };
}

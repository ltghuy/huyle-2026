// Specialized vocabulary sets (feature 012): pure helpers over a set's words
// and the learner's carded ids, shared by the vocabulary page, the home card
// and the lesson planner.
import type { ContentItemOf } from "../content/schema";
import type { WordItem } from "./exercises/types";

export type VocabSetItem = ContentItemOf<"set">;

export interface SetProgress {
  learned: number;
  total: number;
}

/**
 * What to show where a word's level goes: the level for course words, the
 * name of its first set for specialized words, which have no CEFR level (AC-004).
 */
export function setLabel(word: WordItem, setsOfWord: readonly VocabSetItem[]): string {
  if (word.body.source !== "specialized") return word.level;
  return setsOfWord[0]?.body.titleVi ?? word.level;
}

/** A word counts as learned in every set it belongs to once it has a card. */
export function setProgress(words: readonly WordItem[], carded: ReadonlySet<string>): SetProgress {
  return { learned: words.filter((word) => carded.has(word.id)).length, total: words.length };
}

/** The next `count` words of a set not yet carded or removed, in the set's order. */
export function nextSetWords(
  words: readonly WordItem[],
  carded: ReadonlySet<string>,
  skip: ReadonlySet<string>,
  count: number,
): WordItem[] {
  return words.filter((word) => !carded.has(word.id) && !skip.has(word.id)).slice(0, count);
}

/** True when every word of a (non-empty) set has a card. */
export function isSetFinished(words: readonly WordItem[], carded: ReadonlySet<string>): boolean {
  return words.length > 0 && words.every((word) => carded.has(word.id));
}

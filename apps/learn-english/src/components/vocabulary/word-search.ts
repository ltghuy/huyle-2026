import type { ContentItemOf } from "@/content/schema";
import { LEVELS } from "@/learning/types";

type Word = ContentItemOf<"word">;

/** Suggestions shown under the vocabulary search box. */
export const SEARCH_LIMIT = 8;

/** 0 when the headword or a variant starts with `query`, 1 when one only contains it, null otherwise. */
function rank(word: Word, query: string): 0 | 1 | null {
  let best: 0 | 1 | null = null;
  for (const spelling of [word.body.headword, ...word.body.variants]) {
    const at = spelling.toLowerCase().indexOf(query);
    if (at === 0) return 0;
    if (at > 0) best = 1;
  }
  return best;
}

/**
 * Words whose headword or a spelling variant contains `query`, ignoring case:
 * prefix matches first, then easier levels, then shorter headwords, then alphabetical (AC-001, AC-002).
 */
export function searchWords(words: readonly Word[], query: string, limit = SEARCH_LIMIT): Word[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: { word: Word; rank: 0 | 1 }[] = [];
  for (const word of words) {
    const found = rank(word, needle);
    if (found !== null) hits.push({ word, rank: found });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || LEVELS.indexOf(a.word.level) - LEVELS.indexOf(b.word.level) || a.word.body.headword.length - b.word.body.headword.length || a.word.body.headword.localeCompare(b.word.body.headword))
    .slice(0, limit)
    .map((hit) => hit.word);
}

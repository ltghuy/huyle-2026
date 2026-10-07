import { Highlight } from "@/practices/searchable-accordion/highlight";
import { foldText, mergeRanges, type Range } from "@/practices/searchable-accordion/search";

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Ranges where a query word starts a word of `text`, matching the server's
 * rule. Folding per character keeps indices mapped to the original text,
 * so "Brûlée" highlights correctly for "brul" (practice 2's `foldText`).
 */
export function wordPrefixRanges(text: string, query: string): Range[] {
  const terms = query.split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const { folded, starts, ends } = foldText(text);
  const ranges: Range[] = [];
  for (const term of terms) {
    for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + 1)) {
      if (at === 0 || !WORD_CHAR.test(folded[at - 1])) {
        ranges.push([starts[at], ends[at + term.length - 1]]);
      }
    }
  }
  return mergeRanges(ranges);
}

export function HighlightText({ text, query }: { text: string; query: string }) {
  return <Highlight text={text} ranges={wordPrefixRanges(text, query)} />;
}

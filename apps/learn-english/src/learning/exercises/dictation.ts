// Dictation (feature 010): hear a sentence, type it, and see word by word what
// was right. Capitals, punctuation and spaces don't count; a contraction and
// its full form are the same answer ("don't" = "do not"), and one slip in a
// word of 5+ letters still counts but is flagged as a typo (Hard), as in recall.
// A dropped or added ending ("work" for "works") is never a slip.
import { normalize } from "../normalize";
import { damerauLevenshtein, TYPO_MIN_LENGTH } from "./recall";
import type { GradeResult, SentenceItem } from "./types";

export interface DictationInstance {
  kind: "dictation";
  sentenceId: string;
  audio: string;
  en: string;
  vi: string;
  /** Words in the sentence, a contraction counting as one. */
  wordCount: number;
}

export interface DictationAnswer {
  text: string;
  /** The Vietnamese meaning was shown before checking (AC-015). */
  hinted: boolean;
}

export type DictationMark =
  | { status: "right"; word: string }
  | { status: "slip"; word: string; typed: string }
  | { status: "wrong"; word: string; typed: string }
  | { status: "missed"; word: string }
  | { status: "extra"; typed: string };

// Letters and digits, with apostrophes and hyphens inside a word ("don't", "well-known").
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/** The words of a text as written, punctuation dropped. */
export function dictationWords(text: string): string[] {
  return text.match(WORD) ?? [];
}

/** Comparison key: folded and lowercased, apostrophes and hyphens dropped ("Don’t" → "dont"). */
const keyOf = (word: string) => normalize(word).replace(/['-]/g, "");

// Digits and dotted abbreviations ("1990", "9 p.m.") can be written several ways when heard.
const AMBIGUOUS = /\d|\b\p{L}\.\p{L}\./u;

/** True when the sentence has audio and every word has one obvious spelling. */
export function canDictate(sentence: SentenceItem): boolean {
  return sentence.body.audio !== "" && !AMBIGUOUS.test(sentence.body.en) && dictationWords(sentence.body.en).length >= 2;
}

export function buildDictation(input: { sentence: SentenceItem }): DictationInstance | null {
  const { sentence } = input;
  if (!canDictate(sentence)) return null;
  return {
    kind: "dictation",
    sentenceId: sentence.id,
    audio: sentence.body.audio,
    en: sentence.body.en,
    vi: sentence.body.vi,
    wordCount: dictationWords(sentence.body.en).length,
  };
}

const IRREGULAR: Record<string, string[][]> = {
  "can't": [["can", "not"], ["cannot"]],
  cannot: [["can", "not"]],
  "won't": [["will", "not"]],
  "shan't": [["shall", "not"]],
  "let's": [["let", "us"]],
};
// "'s" is only read as "is"/"has" after these; elsewhere it is usually possessive.
const S_BASES = new Set(["he", "she", "it", "that", "there", "here", "what", "who", "where", "how", "when", "why"]);
const SUFFIXES: [string, string[]][] = [
  ["n't", ["not"]],
  ["'re", ["are"]],
  ["'ve", ["have"]],
  ["'ll", ["will"]],
  ["'m", ["am"]],
  ["'d", ["would", "had"]],
  ["'s", ["is", "has"]],
];

/** Full forms of a contraction as word keys, or [] when the word isn't one. */
export function expansions(word: string): string[][] {
  const lower = normalize(word);
  if (IRREGULAR[lower]) return IRREGULAR[lower];
  for (const [suffix, fulls] of SUFFIXES) {
    if (!lower.endsWith(suffix) || lower.length === suffix.length) continue;
    const base = lower.slice(0, -suffix.length);
    if (suffix === "'s" && !S_BASES.has(base)) return [];
    return fulls.map((full) => [keyOf(base), full]);
  }
  return [];
}

interface Expected {
  word: string;
  /** Accepted spellings, each a sequence of word keys. */
  forms: string[][];
}

interface Typed {
  word: string;
  key: string;
  /** Only words typed with an apostrophe count as contractions ("well" is not "we'll"). */
  forms: string[][];
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((value, i) => value === b[i]);

function expectedOf(word: string): Expected {
  const forms = [[keyOf(word)], ...expansions(word)];
  if (word.includes("-")) forms.push(normalize(word).split("-"));
  return { word, forms };
}

function typedOf(word: string): Typed {
  return { word, key: keyOf(word), forms: /['’]/.test(word) ? expansions(word) : [] };
}

/** "work"/"works", "play"/"played": a dropped or added ending is a listening mistake, not a slip. */
function endingOnly(a: string, b: string): boolean {
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return long.startsWith(short) && ["s", "d"].includes(long.slice(short.length));
}

type Step = { cost: number; marks: DictationMark[]; di: number; dj: number };

/**
 * Lines up the typed words with the sentence's words at the lowest cost: a
 * slip costs a little, a wrong, missed or extra word costs one. Returns the
 * sentence in order with each word marked, extra words where they were typed.
 */
export function compareDictation(sentence: string, typedText: string): DictationMark[] {
  const expected = dictationWords(sentence).map(expectedOf);
  const typed = dictationWords(typedText).map(typedOf);
  const n = expected.length;
  const m = typed.length;
  const best: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(Infinity));
  const back: (Step | null)[][] = Array.from({ length: n + 1 }, () => Array<Step | null>(m + 1).fill(null));
  best[0][0] = 0;

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (best[i][j] === Infinity) continue;
      const steps: Step[] = [];
      const e = expected[i];
      const t = typed[j];
      if (e) steps.push({ cost: 1, marks: [{ status: "missed", word: e.word }], di: 1, dj: 0 });
      if (t) steps.push({ cost: 1, marks: [{ status: "extra", typed: t.word }], di: 0, dj: 1 });
      if (e && t) {
        steps.push({ cost: 1, marks: [{ status: "wrong", word: e.word, typed: t.word }], di: 1, dj: 1 });
        for (const form of e.forms) {
          const span = typed.slice(j, j + form.length);
          if (span.length === form.length && same(span.map((word) => word.key), form)) {
            steps.push({ cost: 0, marks: [{ status: "right", word: e.word }], di: 1, dj: form.length });
          }
        }
        const target = keyOf(e.word);
        if ([...target].length >= TYPO_MIN_LENGTH && damerauLevenshtein(t.key, target) === 1 && !endingOnly(t.key, target)) {
          steps.push({ cost: 0.25, marks: [{ status: "slip", word: e.word, typed: t.word }], di: 1, dj: 1 });
        }
        // One typed contraction for two written words ("don't" for "do not").
        const next = expected[i + 1];
        if (next && t.forms.some((form) => same(form, [keyOf(e.word), keyOf(next.word)]))) {
          steps.push({ cost: 0, marks: [{ status: "right", word: e.word }, { status: "right", word: next.word }], di: 2, dj: 1 });
        }
      }
      for (const step of steps) {
        const cost = best[i][j] + step.cost;
        if (cost < best[i + step.di][j + step.dj]) {
          best[i + step.di][j + step.dj] = cost;
          back[i + step.di][j + step.dj] = step;
        }
      }
    }
  }

  const marks: DictationMark[] = [];
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const step = back[i][j];
    if (!step) break;
    marks.unshift(...step.marks);
    i -= step.di;
    j -= step.dj;
  }
  return marks;
}

/** Right when every word is right or a slip; any slip makes it a typo (Hard). */
export function gradeDictation(instance: DictationInstance, answer: DictationAnswer): GradeResult {
  const marks = compareDictation(instance.en, answer.text);
  const correct = marks.every((mark) => mark.status === "right" || mark.status === "slip");
  const typo = correct && marks.some((mark) => mark.status === "slip");
  return { correct, ...(typo ? { typo } : {}), ...(answer.hinted ? { hinted: true } : {}), expected: instance.en };
}

/** Screen-reader summary of the marks (AC-009): "Đúng 6/8 từ, thiếu 1 từ, sai 1 từ". */
export function dictationSummary(marks: readonly DictationMark[]): string {
  const count = (status: DictationMark["status"]) => marks.filter((mark) => mark.status === status).length;
  const total = marks.length - count("extra");
  const parts = [`Đúng ${count("right") + count("slip")}/${total} từ`];
  if (count("slip")) parts.push(`${count("slip")} từ gần đúng`);
  if (count("missed")) parts.push(`thiếu ${count("missed")} từ`);
  if (count("wrong")) parts.push(`sai ${count("wrong")} từ`);
  if (count("extra")) parts.push(`thừa ${count("extra")} từ`);
  return parts.join(", ");
}

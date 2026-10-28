// Rules of the irregular verbs section (feature 008): the pattern of a verb's
// three forms, which spellings are accepted, the text of its audio clip, and
// the near misses for the listening exercise. Pure: no storage, React or fetch.
import type { ContentItemOf } from "../content/schema";

export type FormsItem = ContentItemOf<"forms">;
export type FormsBody = FormsItem["body"];
export type VerbForm = "past" | "participle";

/** How the three forms relate: base, past and participle, A/B/C for each different spelling. */
export const VERB_PATTERNS = ["AAA", "ABB", "ABA", "ABC"] as const;
export type VerbPattern = (typeof VERB_PATTERNS)[number];

export const PATTERN_LABELS: Record<VerbPattern, { title: string; example: string; hintVi: string }> = {
  AAA: { title: "A – A – A", example: "cut – cut – cut", hintVi: "Cả ba dạng giống nhau." },
  ABB: { title: "A – B – B", example: "buy – bought – bought", hintVi: "Quá khứ và quá khứ phân từ giống nhau." },
  ABA: { title: "A – B – A", example: "come – came – come", hintVi: "Quá khứ phân từ giống nguyên mẫu." },
  ABC: { title: "A – B – C", example: "go – went – gone", hintVi: "Cả ba dạng khác nhau." },
};

const lower = (text: string) => text.trim().toLowerCase();

/** The `forms:` item (and review card) id of a word: `word:go-v` → `forms:go-v`. */
export function formsIdOf(wordId: string): `forms:${string}` {
  return `forms:${wordId.slice("word:".length)}`;
}

/** The pattern of the first (taught) past and participle. */
export function patternOf(base: string, forms: Pick<FormsBody, "past" | "participle">): VerbPattern {
  const a = lower(base);
  const b = lower(forms.past[0].text);
  const c = lower(forms.participle[0].text);
  if (a === b && b === c) return "AAA";
  if (b === c) return "ABB";
  if (a === c) return "ABA";
  return "ABC";
}

/** Every accepted spelling of one form, the taught one first. */
export function acceptedForms(forms: Pick<FormsBody, "past" | "participle">, which: VerbForm): string[] {
  return forms[which].map((form) => form.text);
}

/** The three taught forms as the audio clip says them: "go, went, gone". */
export function formsSequence(base: string, forms: Pick<FormsBody, "past" | "participle">): string {
  return [base, forms.past[0].text, forms.participle[0].text].join(", ");
}

/** The -ed form a learner might wrongly build: go → goed, stop → stopped, carry → carried, make → maked. */
export function regularPast(base: string): string {
  const word = lower(base);
  if (word.endsWith("e")) return `${word}d`;
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ied`;
  if (/^[^aeiou]*[aeiou][bdgmnpt]$/.test(word)) return `${word}${word.at(-1)}ed`;
  return `${word}ed`;
}

// Pairs learners confuse, each way round.
const CONFUSED: Record<string, string> = {
  taught: "thought",
  thought: "taught",
  bought: "brought",
  brought: "bought",
  lay: "laid",
  laid: "lay",
  lain: "laid",
  lost: "loosed",
  fell: "felt",
  felt: "fell",
  rose: "raised",
  sat: "set",
  set: "sat",
  wore: "wear",
  rode: "rided",
  drunk: "drank",
  drank: "drunk",
  sang: "sung",
  sung: "sang",
  swam: "swum",
  swum: "swam",
  began: "begun",
  begun: "began",
  ran: "run",
  came: "come",
};

/**
 * Three wrong "base, past, participle" sets for the listening exercise, each
 * a mistake a learner makes: the regular -ed form, past and participle
 * swapped, one form for both, or a confused spelling. Never an accepted
 * combination; order fixed by `seed`.
 */
export function listeningDistractors(base: string, forms: Pick<FormsBody, "past" | "participle">, seed: number): string[] {
  const past = forms.past[0].text;
  const participle = forms.participle[0].text;
  const regular = regularPast(base);
  const set = (b: string, c: string) => [base, b, c].join(", ");
  const candidates = [
    set(regular, regular),
    set(past, regular),
    set(participle, past),
    set(past, past),
    set(participle, participle),
    set(past, base),
    set(CONFUSED[lower(past)] ?? `${past}ed`, participle),
    set(past, CONFUSED[lower(participle)] ?? `${participle}en`),
  ];
  const accepted = new Set(
    forms.past.flatMap((p) => forms.participle.map((pp) => lower(set(p.text, pp.text)))),
  );
  const unique = [...new Map(candidates.filter((c) => !accepted.has(lower(c))).map((c) => [lower(c), c])).values()];
  const start = Math.abs(seed) % Math.max(unique.length, 1);
  return [...unique.slice(start), ...unique.slice(0, start)].slice(0, 3);
}

/** A verb as the section lists it: its forms item, its word, and its pattern. */
export interface VerbEntry {
  forms: FormsItem;
  word: ContentItemOf<"word">;
  pattern: VerbPattern;
}

/** Joins forms items to their words; forms whose word isn't loaded are left out. Ordered by headword. */
export function verbEntries(forms: readonly FormsItem[], words: readonly ContentItemOf<"word">[]): VerbEntry[] {
  const byId = new Map(words.map((word) => [word.id, word]));
  return forms
    .flatMap((item) => {
      const word = byId.get(item.body.wordId);
      return word ? [{ forms: item, word, pattern: patternOf(word.body.headword, item.body) }] : [];
    })
    .sort((a, b) => a.word.body.headword.localeCompare(b.word.body.headword));
}

/** Lowercase without accents ("đi" → "di"), so searches don't need Vietnamese diacritics. */
export function foldForSearch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
}

export interface VerbFilter {
  pattern: VerbPattern | null;
  level: ContentItemOf<"word">["level"] | null;
  query: string;
}

/** The verbs matching every set filter; the query matches any form or the Vietnamese meaning (AC-004, AC-005). */
export function filterVerbs(entries: readonly VerbEntry[], filter: VerbFilter): VerbEntry[] {
  const query = foldForSearch(filter.query);
  return entries.filter((entry) => {
    if (filter.pattern && entry.pattern !== filter.pattern) return false;
    if (filter.level && entry.forms.level !== filter.level) return false;
    if (!query) return true;
    const forms = [entry.word.body.headword, ...acceptedForms(entry.forms.body, "past"), ...acceptedForms(entry.forms.body, "participle")];
    return forms.some((form) => foldForSearch(form).startsWith(query)) || entry.word.body.meaningsVi.some((meaning) => foldForSearch(meaning).includes(query));
  });
}

/** Grammar topics built on an irregular verb form, and which form, for the link to the section (AC-012). */
export const TOPICS_USING_FORMS: Record<string, VerbForm> = {
  "past-simple": "past",
  "present-perfect": "participle",
  "past-perfect": "participle",
};

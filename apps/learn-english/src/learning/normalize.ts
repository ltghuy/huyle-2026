// Fold what a Vietnamese keyboard (Telex/VNI) produced back to the ASCII the
// learner meant to type for English, then compare loosely.

const APOSTROPHES = /[‘’‛ʼʹ`´′]/g;
// Grave, acute, tilde, hook above, dot below: Vietnamese tone marks.
const TONE_MARKS = /[̣̀́̃̉]/g;
const COMBINING = /[̀-ͯ]/g;

// Applied after NFD and tone stripping, so "ấ" (a + circumflex + acute) → "aa".
const LETTER_MARKS: [RegExp, string][] = [
  [/â/g, "aa"],
  [/ê/g, "ee"],
  [/ô/g, "oo"],
  [/ă/g, "aw"],
  [/ư/g, "uw"],
  [/ơ/g, "ow"],
  [/đ/g, "dd"],
];

/** Fold Vietnamese letters, lowercase, straighten apostrophes, trim and collapse spaces. */
export function normalize(raw: string): string {
  let s = raw.replace(APOSTROPHES, "'").toLowerCase().normalize("NFD").replace(TONE_MARKS, "");
  for (const [pattern, ascii] of LETTER_MARKS) s = s.replace(pattern, ascii);
  return s.replace(COMBINING, "").normalize("NFC").replace(/\s+/g, " ").trim();
}

/** True when the input matches the American headword or one of its listed variants. */
export function matchesWord(input: string, headword: string, variants: readonly string[] = []): boolean {
  const typed = normalize(input);
  if (typed === "") return false;
  return [headword, ...variants].some((form) => normalize(form) === typed);
}

export interface Tokens {
  /** Normalised words; apostrophes and hyphens inside a word are kept ("don't"). */
  words: string[];
  /** The sentence's final punctuation (".", "?", "!", "…") or "". */
  final: string;
}

const WORD = /[a-z0-9]+(?:['-][a-z0-9]+)*/g;

export function tokenize(sentence: string): Tokens {
  const s = normalize(sentence);
  const final = /[.?!…]+$/.exec(s.replace(/["')\]]+$/, ""))?.[0] ?? "";
  return { words: s.match(WORD) ?? [], final };
}

/** True when the raw input has non-ASCII letters, e.g. Vietnamese typing is on. */
export function hasNonAscii(raw: string): boolean {
  // Curly apostrophes come from autocorrect, not Vietnamese typing.
  return /[^ -~]/.test(raw.replace(APOSTROPHES, "'").replace(/\s/g, " "));
}

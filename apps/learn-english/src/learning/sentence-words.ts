// Which course word each token of a sentence is, so the shown sentence can
// open a word's details (quick task 037). Pure: no storage, React or fetch.
import type { ContentItemOf } from "../content/schema";
import { normalize } from "./normalize";

type Word = ContentItemOf<"word">;
type Forms = ContentItemOf<"forms">;

/** Finds the word id of one token; `preferred` (the sentence's own words) wins over other words with that spelling. */
export type WordFinder = (token: string, preferred?: readonly string[]) => string | null;

const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

// Forms of "be" that no forms item lists (it lists "was/were" and "been").
const BE_FORMS = ["am", "is", "are"];

/** A spelling to look up, and the parts of speech its ending points to ("likes" → the verb or noun "like"). */
interface Candidate {
  key: string;
  pos: readonly string[];
}

const VERB = ["verb"];
const VERB_OR_NOUN = ["verb", "noun"];

/** The token itself, then the base forms its ending may come from: ideas → idea, carried → carry, making → make. */
function candidates(key: string): Candidate[] {
  const out: Candidate[] = [{ key, pos: [] }];
  const add = (stem: string, pos: readonly string[]) => {
    if (stem.length >= 2) out.push({ key: stem, pos });
  };
  const doubled = (stem: string) => (/([b-df-hj-np-tv-z])\1$/.test(stem) ? stem.slice(0, -1) : null);
  if (key.endsWith("ies")) add(`${key.slice(0, -3)}y`, VERB_OR_NOUN);
  if (key.endsWith("es")) add(key.slice(0, -2), VERB_OR_NOUN);
  if (key.endsWith("s") && !key.endsWith("ss")) add(key.slice(0, -1), VERB_OR_NOUN);
  for (const ending of ["ed", "ing"]) {
    if (!key.endsWith(ending)) continue;
    const stem = key.slice(0, -ending.length);
    if (ending === "ed" && stem.endsWith("i")) add(`${stem.slice(0, -1)}y`, VERB);
    add(stem, VERB);
    add(`${stem}e`, VERB);
    const single = doubled(stem);
    if (single) add(single, VERB);
  }
  return out;
}

/** Builds the finder once per set of loaded words and irregular verb forms. */
export function buildWordFinder(words: Iterable<Word>, forms: readonly Forms[]): WordFinder {
  const byForm = new Map<string, string[]>();
  const put = (form: string, id: string) => {
    const key = normalize(form);
    const ids = byForm.get(key) ?? [];
    if (!ids.includes(id)) byForm.set(key, [...ids, id]);
  };
  const posOf = new Map<string, string>();
  for (const word of words) {
    posOf.set(word.id, word.body.pos);
    for (const form of [word.body.headword, ...word.body.variants]) put(form, word.id);
  }
  for (const item of forms) {
    if (!posOf.has(item.body.wordId)) continue;
    for (const form of [...item.body.past, ...item.body.participle]) put(form.text, item.body.wordId);
  }
  const be = byForm.get("be");
  if (be) for (const form of BE_FORMS) for (const id of be) put(form, id);

  return (token, preferred = []) => {
    const key = normalize(token).replace(EDGE_PUNCTUATION, "");
    if (key === "") return null;
    for (const { key: form, pos } of candidates(key)) {
      const found = byForm.get(form);
      if (!found) continue;
      return found.find((id) => preferred.includes(id)) ?? found.find((id) => pos.includes(posOf.get(id) ?? "")) ?? found[0];
    }
    return null;
  };
}

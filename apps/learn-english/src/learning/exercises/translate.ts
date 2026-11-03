// Translate a sentence (feature 016): read the Vietnamese, type the English.
// The answer is right when it matches the sentence's English, one of its other
// accepted word orders, or a wording the owner approved from a learner's claim.
// Only case, punctuation, spacing, hyphens and contractions are forgiven
// ("don't" = "do not"); any other difference is wrong, and the learner can
// claim it instead.
import type { CardItemId } from "../types";
import { normalize } from "../normalize";
import { expansions } from "./dictation";
import { acceptedText } from "./tiles";
import type { GradeResult, SentenceItem } from "./types";

export interface TranslateInstance {
  kind: "translate";
  sentenceId: string;
  /** Set in Ôn tập: the attempt and the reschedule go to this card instead of the sentence. */
  cardId?: CardItemId;
  vi: string;
  en: string;
  audio: string;
  /** The sentence's tokens and words, to show the answer word by word (quick task 038). */
  tokens: readonly string[];
  wordIds: readonly string[];
  /** Answer keys of every accepted wording. */
  accepted: string[];
}

export interface TranslateAnswer {
  text: string;
}

export interface TranslateInput {
  sentence: SentenceItem;
  /** Wordings the owner approved for this sentence. */
  wordings?: readonly string[];
  cardId?: CardItemId;
}

/** A claim may be at most this many times the reference's length, and never longer than MAX_CLAIM_LENGTH. */
export const CLAIM_LENGTH_FACTOR = 3;
export const MAX_CLAIM_LENGTH = 500;
/** Cap on the spellings one text expands to ("he's" is "he is" or "he has"). */
const MAX_KEYS = 64;

const WORD = /[a-z0-9]+(?:['-][a-z0-9]+)*/g;
const keyOf = (word: string) => word.replace(/['-]/g, "");

/** Every way of spelling one word: as typed, its full forms, and hyphen parts as separate words. */
function formsOf(word: string): string[][] {
  const forms = [[keyOf(word)], ...expansions(word)];
  if (word.includes("-")) forms.push(word.split("-"));
  return forms;
}

/**
 * The comparable spellings of a text: lowercase, no punctuation, single spaces,
 * contractions both kept and expanded. Two texts are the same answer when their
 * key sets share a key.
 */
export function answerKeys(text: string): string[] {
  const words = normalize(text).match(WORD) ?? [];
  let keys: string[][] = [[]];
  for (const word of words) {
    const next: string[][] = [];
    for (const key of keys) {
      for (const form of formsOf(word)) {
        next.push([...key, ...form]);
        if (next.length >= MAX_KEYS) break;
      }
      if (next.length >= MAX_KEYS) break;
    }
    keys = next;
  }
  return [...new Set(keys.map((key) => key.join(" ")))].filter((key) => key !== "");
}

/** The single key used to group identical claims (first spelling, contractions expanded where unambiguous). */
export function claimKey(text: string): string {
  return answerKeys(text).toSorted()[0] ?? "";
}

/** Every sentence with a Vietnamese prompt and an English answer can be translated. */
export function canTranslate(sentence: SentenceItem): boolean {
  return sentence.body.vi.trim() !== "" && answerKeys(sentence.body.en).length > 0;
}

export function buildTranslate({ sentence, wordings = [], cardId }: TranslateInput): TranslateInstance | null {
  if (!canTranslate(sentence)) return null;
  const { body } = sentence;
  const texts = [body.en, ...body.acceptedOrders.map((order) => acceptedText(body, order)), ...wordings];
  return {
    kind: "translate",
    sentenceId: sentence.id,
    ...(cardId ? { cardId } : {}),
    vi: body.vi,
    en: body.en,
    audio: body.audio,
    tokens: body.tokens,
    wordIds: body.wordIds,
    accepted: [...new Set(texts.flatMap(answerKeys))],
  };
}

export function gradeTranslate(instance: TranslateInstance, answer: TranslateAnswer): GradeResult {
  const accepted = new Set(instance.accepted);
  return { correct: answerKeys(answer.text).some((key) => accepted.has(key)), expected: instance.en };
}

/** What a claim needs from the exercise; the runner adds the related cards. */
export interface ClaimDraft {
  sentenceId: string;
  answer: string;
  expected: string;
  vi: string;
}

/** The claim for a wrong answer, or null when it can't be claimed. */
export function claimOfTranslate(instance: TranslateInstance, answer: TranslateAnswer): ClaimDraft | null {
  if (!canClaim(instance, answer.text)) return null;
  return { sentenceId: instance.sentenceId, answer: answer.text.trim(), expected: instance.en, vi: instance.vi };
}

/** Whether a wrong answer may be claimed: not blank, and not far longer than the sentence (AC-010). */
export function canClaim(instance: Pick<TranslateInstance, "en">, text: string): boolean {
  const answer = text.trim();
  return answer !== "" && answer.length <= Math.min(MAX_CLAIM_LENGTH, CLAIM_LENGTH_FACTOR * instance.en.length);
}

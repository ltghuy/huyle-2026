// Arena questions (feature 023): which items a level can ask, a round's
// questions from a seed, what players see before the answer, and grading.
// Built on the solo exercises so the Arena grades exactly like practice:
// listening choice (4 lookalike options), recall (a one-letter slip in a word
// of 5+ letters counts) and translate (accepted orders and approved wordings).
import { buildListeningChoice, gradeListeningChoice, type ListeningChoiceInstance } from "../exercises/listening";
import { createRng, randomInt, shuffle, type Rng } from "../exercises/random";
import { buildRecall, gradeRecall, type RecallInstance } from "../exercises/recall";
import { buildTranslate, canTranslate, gradeTranslate, type TranslateInstance } from "../exercises/translate";
import type { SentenceItem, WordItem } from "../exercises/types";
import type { ArenaMode, PublicQuestion, QuestionType, Reveal } from "./protocol";

/** Questions in a round (owner's rule). */
export const ROUND_SIZE = 12;
/** Sudden-death questions a tied round may need (AC-021). */
export const MAX_SUDDEN_DEATH = 3;
/** Longest sentence "Viết câu" asks: one that can be typed in time. */
export const MAX_WRITE_TOKENS = 12;

/** A level's content, as the room loads it from D1. */
export interface ArenaPool {
  words: readonly WordItem[];
  sentences: readonly SentenceItem[];
  /** Approved extra wordings per sentence id (feature 016). */
  wordings: ReadonlyMap<string, readonly string[]>;
}

/** A question with its answer key: kept in the room, never sent before the reveal. */
export type ServerQuestion =
  | { type: "listen"; itemId: string; ipa: string; instance: ListeningChoiceInstance }
  | { type: "recall"; itemId: string; ipa: string; instance: RecallInstance }
  | { type: "write"; itemId: string; instance: TranslateInstance };

export type ArenaAnswer = { text: string } | { choice: number };

const MODE_TYPES: Record<ArenaMode, readonly QuestionType[]> = {
  listen: ["listen"],
  recall: ["recall"],
  write: ["write"],
  mixed: ["listen", "recall", "write"],
};

function canListen(word: WordItem): boolean {
  return word.body.audio !== "";
}

function canRecall(word: WordItem): boolean {
  return word.body.meaningsVi.length > 0 && word.body.headword.trim() !== "";
}

function canWrite(sentence: SentenceItem): boolean {
  return sentence.body.tokens.length <= MAX_WRITE_TOKENS && canTranslate(sentence);
}

/** Items of the pool a question type can ask about. */
function eligible(pool: ArenaPool, type: QuestionType): readonly (WordItem | SentenceItem)[] {
  if (type === "listen") return pool.words.filter(canListen);
  if (type === "recall") return pool.words.filter(canRecall);
  return pool.sentences.filter(canWrite);
}

/** Items each type of a mode needs: a full round plus every sudden-death question, spread over the mode's types. */
function needed(mode: ArenaMode): number {
  return Math.ceil((ROUND_SIZE + MAX_SUDDEN_DEATH) / MODE_TYPES[mode].length);
}

/** Modes this level can run; a mode is left out when a type it uses runs short (spec edge case). */
export function availableModes(pool: ArenaPool): ArenaMode[] {
  const counts = new Map<QuestionType, number>((["listen", "recall", "write"] as const).map((type) => [type, eligible(pool, type).length]));
  return (Object.keys(MODE_TYPES) as ArenaMode[]).filter((mode) => MODE_TYPES[mode].every((type) => (counts.get(type) ?? 0) >= needed(mode)));
}

/** The type of each question: one type, or the three in equal shares, shuffled. */
function typesFor(mode: ArenaMode, count: number, rng: Rng): QuestionType[] {
  const types = MODE_TYPES[mode];
  if (types.length === 1) return Array.from({ length: count }, () => types[0]);
  if (count < types.length) return Array.from({ length: count }, () => types[randomInt(rng, types.length)]);
  return shuffle(Array.from({ length: count }, (_, i) => types[i % types.length]), rng);
}

function build(type: QuestionType, item: WordItem | SentenceItem, pool: ArenaPool, seed: number): ServerQuestion | null {
  if (type === "write") {
    const sentence = item as SentenceItem;
    const instance = buildTranslate({ sentence, wordings: pool.wordings.get(sentence.id) });
    return instance ? { type, itemId: sentence.id, instance } : null;
  }
  const word = item as WordItem;
  if (type === "recall") return { type, itemId: word.id, ipa: word.body.ipa, instance: buildRecall({ target: word }) };
  const instance = buildListeningChoice({ target: word, pool: pool.words }, seed);
  return instance ? { type, itemId: word.id, ipa: word.body.ipa, instance } : null;
}

/**
 * The questions of a round (12), or of one sudden-death question (`count` 1), the same for every
 * player. Items in `exclude` (asked earlier in the match) are used only when a type runs out, and
 * no item is asked twice in one call. Same seed, same questions.
 */
export function buildRound(pool: ArenaPool, mode: ArenaMode, seed: number, count = ROUND_SIZE, exclude: ReadonlySet<string> = new Set()): ServerQuestion[] {
  const rng = createRng(seed);
  const queues = new Map<QuestionType, (WordItem | SentenceItem)[]>();
  const queueOf = (type: QuestionType) => {
    let queue = queues.get(type);
    if (!queue) {
      const items = shuffle(eligible(pool, type), rng);
      // Fresh items first, then the ones already asked this match.
      queue = [...items.filter((item) => !exclude.has(item.id)), ...items.filter((item) => exclude.has(item.id))];
      queues.set(type, queue);
    }
    return queue;
  };

  const used = new Set<string>();
  const questions: ServerQuestion[] = [];
  for (const type of typesFor(mode, count, rng)) {
    const queue = queueOf(type);
    let question: ServerQuestion | null = null;
    while (!question && queue.length > 0) {
      const item = queue.shift()!;
      // A word is never both heard and recalled in the same round.
      if (used.has(item.id)) continue;
      question = build(type, item, pool, randomInt(rng, 2 ** 31));
    }
    if (!question) break;
    used.add(question.itemId);
    questions.push(question);
  }
  return questions;
}

/** The headword with every letter or digit as "_", keeping spaces, hyphens and apostrophes. */
export function letterMask(headword: string): string {
  return headword.replace(/[\p{L}\p{N}]/gu, "_");
}

/** What a hint hides each letter with ("h****"). */
export const HINT_MARK = "*";

/**
 * A team-match hint (feature 039): "Nhớ lại từ" shows the word's first letter only ("happy" as "h****"),
 * "Viết câu" the first letter of every word ("I am happy" as "I a* h****"). Spaces, hyphens, apostrophes
 * and punctuation stay. Null for "Nghe và chọn từ", which has no hints.
 */
export function hintMask(question: ServerQuestion): string | null {
  if (question.type === "listen") return null;
  if (question.type === "recall") {
    let shown = false;
    return question.instance.headword.replace(/[\p{L}\p{N}]/gu, (char) => {
      if (shown) return HINT_MARK;
      shown = true;
      return char;
    });
  }
  return question.instance.en
    .split(/(\s+)/)
    .map((part) => {
      let shown = false;
      return part.replace(/[\p{L}\p{N}]/gu, (char) => {
        if (shown) return HINT_MARK;
        shown = true;
        return char;
      });
    })
    .join("");
}

/**
 * A team round's questions (feature 039): `size` of them from the seed, in passes, so a level shorter
 * than the round repeats its items rather than running out. Shorter than `size` only when the pool
 * has nothing the mode can ask.
 */
export function buildDeck(pool: ArenaPool, mode: ArenaMode, seed: number, size: number, exclude: ReadonlySet<string> = new Set()): ServerQuestion[] {
  const rng = createRng(seed);
  const asked = new Set(exclude);
  const deck: ServerQuestion[] = [];
  while (deck.length < size) {
    const pass = buildRound(pool, mode, randomInt(rng, 2 ** 31), size - deck.length, asked);
    if (pass.length === 0) break;
    for (const question of pass) {
      asked.add(question.itemId);
      deck.push(question);
    }
  }
  return deck;
}

/** What players see while the question is open (AC-019). */
export function publicView(question: ServerQuestion): PublicQuestion {
  if (question.type === "listen") return { type: "listen", audio: question.instance.audio, options: [...question.instance.options] };
  if (question.type === "recall") {
    const { meaningsVi, pos, headword } = question.instance;
    return { type: "recall", meaningsVi: [...meaningsVi], pos, mask: letterMask(headword) };
  }
  return { type: "write", vi: question.instance.vi };
}

/** What players see once the question ends (AC-018). Sentences get no clip: the reveal plays word clips only. */
export function revealOf(question: ServerQuestion, answeredBy: string | null): Reveal {
  if (question.type === "listen") {
    const { options, answerIndex, audio } = question.instance;
    return { answer: options[answerIndex], answerIndex, ipa: question.ipa, audio, answeredBy };
  }
  if (question.type === "recall") return { answer: question.instance.headword, ipa: question.ipa, audio: question.instance.audio, answeredBy };
  return { answer: question.instance.en, answeredBy };
}

/** Whether an answer is right, graded like the solo exercise of that type (AC-015). The wrong kind of answer is wrong. */
export function isCorrect(question: ServerQuestion, answer: ArenaAnswer): boolean {
  if (question.type === "listen") return "choice" in answer && gradeListeningChoice(question.instance, answer.choice).correct;
  if (!("text" in answer)) return false;
  if (question.type === "recall") return gradeRecall(question.instance, answer.text).correct;
  return gradeTranslate(question.instance, { text: answer.text }).correct;
}

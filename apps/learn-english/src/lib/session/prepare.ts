import type { ContentItemOf } from "@/content/schema";
import { buildChooseSentence } from "@/learning/exercises/choose-sentence";
import { buildDictation, canDictate } from "@/learning/exercises/dictation";
import { buildFindError } from "@/learning/exercises/find-error";
import { buildFormsGap, buildFormsListening, buildFormsTyping } from "@/learning/exercises/forms";
import { buildGrammarGap } from "@/learning/exercises/grammar-gap";
import { buildListeningChoice, buildListeningTyping } from "@/learning/exercises/listening";
import { buildMcq } from "@/learning/exercises/mcq";
import { buildMissingLetters } from "@/learning/exercises/missing-letters";
import { buildRecall } from "@/learning/exercises/recall";
import { buildSentenceGap } from "@/learning/exercises/sentence-gap";
import { buildTileTranslate, hasTileDistractors } from "@/learning/exercises/tile-translate";
import { buildWordOrder } from "@/learning/exercises/word-order";
import type { CardItemId, ExerciseDescriptor } from "@/learning/types";
import type { RelatedItems, RunnerStep } from "@/components/exercise/exercise-runner";
import type { ExerciseInstance } from "@/components/exercise/registry";
import type { ContentIndex } from "./content-index";

type Word = ContentItemOf<"word">;
type Grammar = ContentItemOf<"grammar">;
type Sentence = ContentItemOf<"sentence">;

/**
 * Words of the sets holding any of `wordIds` that is a specialized word
 * (feature 012), so jargon is mixed with jargon, not with everyday words.
 * Empty when none of them is specialized.
 */
function setWordsFor(index: ContentIndex, wordIds: readonly string[]): Word[] {
  const setIds = new Set(
    wordIds.flatMap((id) => {
      const word = index.byId.get(id);
      return word?.kind === "word" && word.body.source === "specialized" ? (index.setsByWord.get(id) ?? []) : [];
    }),
  );
  return index.sets.filter((set) => setIds.has(set.item.id)).flatMap((set) => set.words);
}

/** Below this many set words, a specialized word's pool is topped up with its level's words. */
const MIN_SET_POOL = 10;

/** Distractor pool for a word: its level's words, or its sets' words for a specialized word. */
function sameLevelWords(index: ContentIndex, word: Word): readonly Word[] {
  const levelWords = index.wordsByLevel[word.level] ?? [];
  const setWords = setWordsFor(index, [word.id]);
  if (setWords.length === 0) return levelWords;
  const pool = new Map(setWords.map((entry) => [entry.id, entry]));
  if (pool.size < MIN_SET_POOL) for (const entry of levelWords) pool.set(entry.id, entry);
  return [...pool.values()];
}

function examplesOf(index: ContentIndex, ids: readonly string[]): Sentence[] {
  return ids.map((id) => index.byId.get(id)).filter((item): item is Sentence => item?.kind === "sentence");
}

function grammarLink(grammar: Grammar): RelatedItems["link"] {
  return { href: `/grammar?topic=${grammar.id.slice("grammar:".length)}`, label: grammar.body.titleVi };
}

/** Cards a sentence practises, plus a link to the grammar point (or the first word). */
function sentenceRelated(index: ContentIndex, sentence: Sentence): RelatedItems {
  const cardIds: CardItemId[] = sentence.body.wordIds.filter((id): id is CardItemId => id.startsWith("word:"));
  const grammar = sentence.body.grammarSlug ? index.byId.get(`grammar:${sentence.body.grammarSlug}`) : undefined;
  if (grammar?.kind === "grammar") {
    cardIds.push(grammar.id as CardItemId);
    return { cardIds, link: grammarLink(grammar) };
  }
  const word = index.byId.get(cardIds[0] ?? "");
  return { cardIds, link: word?.kind === "word" ? { href: `/vocabulary?word=${encodeURIComponent(word.id)}`, label: word.body.headword } : undefined };
}

/**
 * Headwords at the sentence's level (or of the sets of a specialized word it
 * practises), minus the words the sentence itself practises.
 */
function distractorWords(index: ContentIndex, sentence: Sentence): readonly string[] {
  const { headwords, dropped } = distractorSource(index, sentence);
  return dropped.size === 0 ? headwords : headwords.filter((headword) => !dropped.has(headword));
}

/** `distractorWords` one at a time, without copying the pool. */
function* eachDistractorWord(index: ContentIndex, sentence: Sentence): Generator<string> {
  const { headwords, dropped } = distractorSource(index, sentence);
  for (const headword of headwords) if (!dropped.has(headword)) yield headword;
}

/**
 * The pool's headwords and the ones to leave out. A level pool holds
 * thousands of words and the exercise library probes every sentence of a
 * level, so its headwords are collected once per pool. Dropping a headword
 * only the sentence's own words carry keeps the order of the full
 * computation; a headword shared with another word needs the full one.
 */
function distractorSource(index: ContentIndex, sentence: Sentence): { headwords: readonly string[]; dropped: ReadonlySet<string> } {
  const own = new Set(sentence.body.wordIds);
  const setWords = setWordsFor(index, sentence.body.wordIds);
  const pool = setWords.length > 0 ? setWords : (index.wordsByLevel[sentence.level] ?? []);
  const { headwords, idsByHeadword } = poolHeadwords(pool);
  const dropped = new Set<string>();
  for (const id of own) {
    const word = index.byId.get(id);
    if (word?.kind !== "word") continue;
    const ids = idsByHeadword.get(word.body.headword);
    if (!ids?.includes(id)) continue;
    if (!ids.every((entry) => own.has(entry))) {
      return { headwords: [...new Set(pool.filter((entry) => !own.has(entry.id)).map((entry) => entry.body.headword))], dropped: new Set() };
    }
    dropped.add(word.body.headword);
  }
  return { headwords, dropped };
}

interface PoolHeadwords {
  /** Unique headwords, in pool order. */
  headwords: readonly string[];
  idsByHeadword: ReadonlyMap<string, readonly string[]>;
}

const headwordCache = new WeakMap<readonly Word[], PoolHeadwords>();

/** The headwords of `pool`, cached while the pool (an index's word list) lives. */
function poolHeadwords(pool: readonly Word[]): PoolHeadwords {
  const cached = headwordCache.get(pool);
  if (cached) return cached;
  const idsByHeadword = new Map<string, string[]>();
  for (const word of pool) idsByHeadword.set(word.body.headword, [...(idsByHeadword.get(word.body.headword) ?? []), word.id]);
  const entry = { headwords: [...idsByHeadword.keys()], idsByHeadword };
  headwordCache.set(pool, entry);
  return entry;
}

/** A forms item with its verb, or null when either is gone. */
function verbOf(index: ContentIndex, item: ContentItemOf<"forms">) {
  const word = index.byId.get(item.body.wordId);
  return word?.kind === "word" ? { forms: item, word } : null;
}

function exerciseStep(key: string, seed: number, instance: ExerciseInstance | null, extra: Partial<Extract<RunnerStep, { type: "exercise" }>> = {}): RunnerStep | null {
  return instance ? { key, type: "exercise", instance, seed, ...extra } : null;
}

/**
 * Builds the runner step for one planned exercise, or null when the content
 * behind it is gone or can't support that exercise (the caller skips it).
 */
export function prepareStep(descriptor: ExerciseDescriptor, index: ContentIndex, key: string): RunnerStep | null {
  const item = index.byId.get(descriptor.itemIds[0] ?? "");
  if (!item) return null;
  const { seed } = descriptor;

  switch (descriptor.kind) {
    case "study":
      if (item.kind !== "word" && item.kind !== "grammar") return null;
      return { key, type: "study", item, examples: examplesOf(index, item.body.examples) };
    case "mcq":
      return item.kind === "word" ? exerciseStep(key, seed, buildMcq({ target: item, pool: sameLevelWords(index, item) }, seed)) : null;
    case "missing-letters":
      return item.kind === "word" ? exerciseStep(key, seed, buildMissingLetters({ target: item }, seed)) : null;
    case "recall":
      return item.kind === "word" ? exerciseStep(key, seed, buildRecall({ target: item })) : null;
    case "listening": {
      if (item.kind !== "word") return null;
      const listening = buildListeningChoice({ target: item, pool: sameLevelWords(index, item) }, seed) ?? buildListeningTyping({ target: item });
      return exerciseStep(key, seed, listening, { fallback: buildRecall({ target: item }) });
    }
    case "grammar-gap":
      return item.kind === "grammar"
        ? exerciseStep(key, seed, buildGrammarGap({ grammar: item }, seed), { related: { cardIds: [item.id as CardItemId], link: grammarLink(item) } })
        : null;
    case "word-order":
      return item.kind === "sentence" ? exerciseStep(key, seed, buildWordOrder({ sentence: item, distractorPool: distractorWords(index, item) }, seed), { related: sentenceRelated(index, item) }) : null;
    case "sentence-gap":
      return item.kind === "sentence"
        ? exerciseStep(key, seed, buildSentenceGap({ sentence: item, distractorWords: distractorWords(index, item) }, seed), { related: sentenceRelated(index, item) })
        : null;
    case "choose-sentence":
      return item.kind === "sentence" ? exerciseStep(key, seed, buildChooseSentence({ sentence: item }, seed), { related: sentenceRelated(index, item) }) : null;
    case "tile-translate":
      return item.kind === "sentence"
        ? exerciseStep(key, seed, buildTileTranslate({ sentence: item, distractorPool: distractorWords(index, item) }, seed), { related: sentenceRelated(index, item) })
        : null;
    case "find-error":
      return item.kind === "sentence" ? exerciseStep(key, seed, buildFindError({ sentence: item }, seed), { related: sentenceRelated(index, item) }) : null;
    case "dictation":
      // A clip that can't play swaps to putting the words in order, which needs no audio.
      return item.kind === "sentence"
        ? exerciseStep(key, seed, buildDictation({ sentence: item }), { related: sentenceRelated(index, item), fallback: buildWordOrder({ sentence: item, distractorPool: distractorWords(index, item) }, seed) })
        : null;
    case "forms-typing":
    case "forms-gap":
    case "forms-listening": {
      const verb = item.kind === "forms" ? verbOf(index, item) : null;
      if (!verb) return null;
      if (descriptor.kind === "forms-typing") return exerciseStep(key, seed, buildFormsTyping(verb, seed));
      if (descriptor.kind === "forms-gap") return exerciseStep(key, seed, buildFormsGap(verb, seed) ?? buildFormsTyping(verb, seed));
      // A clip that can't play swaps to typing, like word listening.
      return exerciseStep(key, seed, buildFormsListening(verb, seed) ?? buildFormsTyping(verb, seed), { fallback: buildFormsTyping(verb, seed) });
    }
    case "writing":
      return item.kind === "writing"
        ? exerciseStep(key, seed, { kind: "writing", writingId: item.id, promptVi: item.body.promptVi, modelAnswers: item.body.modelAnswers })
        : null;
  }
}

export function prepareSteps(descriptors: readonly ExerciseDescriptor[], index: ContentIndex, keyPrefix: string): RunnerStep[] {
  return descriptors.flatMap((descriptor, i) => prepareStep(descriptor, index, `${keyPrefix}-${i}`) ?? []);
}

/**
 * Whether `prepareStep` would return a step for a sentence exercise, without
 * building it. Building shuffles the whole distractor pool, too slow to run
 * for every sentence of a level (the exercise library, quick task 031).
 */
export function canPrepareSentenceStep(kind: ExerciseDescriptor["kind"], sentenceId: string, index: ContentIndex): boolean {
  const item = index.byId.get(sentenceId);
  if (item?.kind !== "sentence") return false;
  switch (kind) {
    case "word-order":
      return true;
    case "sentence-gap":
      return item.body.gapCandidates.length > 0;
    case "tile-translate":
      return hasTileDistractors(item, eachDistractorWord(index, item));
    case "dictation":
      return canDictate(item);
    default:
      return prepareStep({ kind, itemIds: [sentenceId], seed: 0 }, index, "probe") !== null;
  }
}

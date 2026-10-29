import type { ContentItemOf } from "@/content/schema";
import { buildChooseSentence } from "@/learning/exercises/choose-sentence";
import { buildDictation } from "@/learning/exercises/dictation";
import { buildFormsGap, buildFormsListening, buildFormsTyping } from "@/learning/exercises/forms";
import { buildGrammarGap } from "@/learning/exercises/grammar-gap";
import { buildListeningChoice, buildListeningTyping } from "@/learning/exercises/listening";
import { buildMcq } from "@/learning/exercises/mcq";
import { buildMissingLetters } from "@/learning/exercises/missing-letters";
import { buildRecall } from "@/learning/exercises/recall";
import { buildSentenceGap } from "@/learning/exercises/sentence-gap";
import { buildTileTranslate } from "@/learning/exercises/tile-translate";
import { buildWordOrder } from "@/learning/exercises/word-order";
import type { CardItemId, ExerciseDescriptor } from "@/learning/types";
import type { RelatedItems, RunnerStep } from "@/components/exercise/exercise-runner";
import type { ExerciseInstance } from "@/components/exercise/registry";
import type { ContentIndex } from "./content-index";

type Word = ContentItemOf<"word">;
type Grammar = ContentItemOf<"grammar">;
type Sentence = ContentItemOf<"sentence">;

function sameLevelWords(index: ContentIndex, word: { level: Word["level"] }): readonly Word[] {
  return index.wordsByLevel[word.level] ?? [];
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

/** Headwords at the sentence's level, minus the words the sentence itself practises. */
function distractorWords(index: ContentIndex, sentence: Sentence): string[] {
  const own = new Set(sentence.body.wordIds);
  return (index.wordsByLevel[sentence.level] ?? []).filter((word) => !own.has(word.id)).map((word) => word.body.headword);
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
      return item.kind === "sentence" ? exerciseStep(key, seed, buildWordOrder({ sentence: item }, seed), { related: sentenceRelated(index, item) }) : null;
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
    case "dictation":
      // A clip that can't play swaps to putting the words in order, which needs no audio.
      return item.kind === "sentence"
        ? exerciseStep(key, seed, buildDictation({ sentence: item }), { related: sentenceRelated(index, item), fallback: buildWordOrder({ sentence: item }, seed) })
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

import type { ContentItemOf } from "@/content/schema";
import { MCQ_OPTIONS } from "@/learning/exercises/mcq";
import { createRng, shuffle } from "@/learning/exercises/random";
import type { ExerciseKind, Level } from "@/learning/types";
import type { RunnerStep } from "@/components/exercise/exercise-runner";
import type { ContentIndex } from "@/lib/session/content-index";
import { prepareStep } from "@/lib/session/prepare";
import { parseLevel } from "@/lib/search-params";
import { compareTopics, grammarSlug, grammarTopicMeta, topicOf, topicTitle } from "@/lib/topics";

// The exercise library (AC-026): one set per (level, topic, exercise type)
// for words and sentences, and one per grammar topic. Steps are built with
// the same generators as the daily lesson, seeded from the set id so a set
// looks the same each time; "Làm lại" moves to the next round.

type Grammar = ContentItemOf<"grammar">;

export const WORD_TYPES = ["mcq", "missing-letters", "listening", "recall"] as const;
export const SENTENCE_TYPES = ["word-order", "sentence-gap", "choose-sentence", "tile-translate"] as const;
export const SET_TYPES = [...WORD_TYPES, "grammar-gap", ...SENTENCE_TYPES] as const;
export type SetType = (typeof SET_TYPES)[number];
export type SetGroup = "word" | "grammar" | "sentence";

export const TYPE_LABELS: Record<SetType, string> = {
  mcq: "Trắc nghiệm nghĩa",
  "missing-letters": "Điền chữ còn thiếu",
  listening: "Nghe và chọn từ",
  recall: "Nhớ lại từ",
  "grammar-gap": "Điền vào chỗ trống",
  "word-order": "Sắp xếp câu",
  "sentence-gap": "Điền từ vào câu",
  "choose-sentence": "Chọn câu đúng",
  "tile-translate": "Dịch bằng thẻ từ",
};

/** Most steps in one run of a set. */
export const SET_SIZE = 10;

export interface ExerciseSet {
  /** `<type>.<level>.<topic>` for words and sentences, `grammar-gap.<slug>` for grammar. */
  id: string;
  type: SetType;
  group: SetGroup;
  level: Level;
  /** Topic slug (words, sentences) or grammar slug. */
  scope: string;
  itemIds: string[];
}

export interface SetCard {
  key: string;
  group: SetGroup;
  scope: string;
  title: string;
  /** English grammar title, shown with `lang="en"`. */
  titleEn?: string;
  count: number;
  sets: ExerciseSet[];
}

export function isSetType(value: string | null): value is SetType {
  return SET_TYPES.some((type) => type === value);
}

/** FNV-1a: a stable 32-bit seed from a string, independent of time. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The level a set id belongs to, so a shared `?id=` link opens on the right level. */
export function levelOfSetId(id: string): Level | null {
  const [type, second] = id.split(".");
  if (type === "grammar-gap") return grammarTopicMeta(second ?? "")?.level ?? null;
  return parseLevel(second ?? null);
}

function groupBy<T extends { topic?: string }>(items: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const slug = topicOf(item);
    groups.set(slug, [...(groups.get(slug) ?? []), item]);
  }
  return new Map([...groups.entries()].sort((a, b) => compareTopics(a[0], b[0])));
}

function eligibleSentences(index: ContentIndex, sentenceIds: readonly string[], type: SetType): string[] {
  return sentenceIds.filter((id) => prepareStep({ kind: type, itemIds: [id], seed: 0 }, index, "probe") !== null);
}

/** Every set at `level`, grouped into cards (one per topic or grammar point). */
export function listSetCards(index: ContentIndex, level: Level): SetCard[] {
  const cards: SetCard[] = [];
  const words = index.wordsByLevel[level] ?? [];
  for (const [topic, group] of groupBy(words)) {
    const ids = group.map((word) => word.id);
    const types = WORD_TYPES.filter((type) => type !== "mcq" || words.length >= MCQ_OPTIONS);
    cards.push({
      key: `word.${topic}`,
      group: "word",
      scope: topic,
      title: topicTitle(topic),
      count: ids.length,
      sets: types.map((type) => ({ id: `${type}.${level}.${topic}`, type, group: "word", level, scope: topic, itemIds: ids })),
    });
  }

  for (const grammar of index.grammarByLevel[level] ?? []) {
    if (grammar.body.practice.length === 0) continue;
    const slug = grammarSlug(grammar.id);
    cards.push({
      key: `grammar.${slug}`,
      group: "grammar",
      scope: slug,
      title: grammar.body.titleVi,
      titleEn: grammar.body.titleEn,
      count: grammar.body.practice.length,
      sets: [{ id: `grammar-gap.${slug}`, type: "grammar-gap", group: "grammar", level, scope: slug, itemIds: [grammar.id] }],
    });
  }

  const sentences = index.lesson.sentences.filter((sentence) => sentence.level === level);
  for (const [topic, group] of groupBy(sentences)) {
    const ids = group.map((sentence) => sentence.id);
    const sets = SENTENCE_TYPES.flatMap((type): ExerciseSet[] => {
      const itemIds = eligibleSentences(index, ids, type);
      return itemIds.length ? [{ id: `${type}.${level}.${topic}`, type, group: "sentence", level, scope: topic, itemIds }] : [];
    });
    if (sets.length) cards.push({ key: `sentence.${topic}`, group: "sentence", scope: topic, title: topicTitle(topic), count: ids.length, sets });
  }
  return cards;
}

/**
 * One grammar-gap step per practice item of the topic. The generator picks
 * the item from its seed, so seeds are tried in turn until each item is
 * covered; `round` shuffles the order for "Làm lại".
 */
export function grammarPracticeSteps(grammar: Grammar, index: ContentIndex, round = 0): RunnerStep[] {
  const total = grammar.body.practice.length;
  const byItem = new Map<number, RunnerStep>();
  for (let seed = 0; seed < total * 64 && byItem.size < total; seed++) {
    const step = prepareStep({ kind: "grammar-gap", itemIds: [grammar.id], seed }, index, `${grammar.id}-${round}-${seed}`);
    if (step?.type === "exercise" && step.instance.kind === "grammar-gap" && !byItem.has(step.instance.practiceIndex)) {
      byItem.set(step.instance.practiceIndex, step);
    }
  }
  const ordered = [...byItem.entries()].sort((a, b) => a[0] - b[0]).map(([, step]) => step);
  return round === 0 ? ordered : shuffle(ordered, createRng(hashString(grammar.id) + round));
}

/** Up to `SET_SIZE` runner steps for a set; items that can't make an exercise are skipped. */
export function buildSetSteps(set: ExerciseSet, index: ContentIndex, round = 0): RunnerStep[] {
  if (set.type === "grammar-gap") {
    const grammar = index.byId.get(set.itemIds[0] ?? "");
    return grammar?.kind === "grammar" ? grammarPracticeSteps(grammar, index, round).slice(0, SET_SIZE) : [];
  }
  const base = hashString(set.id) + round * 7919;
  const steps: RunnerStep[] = [];
  for (const [i, itemId] of shuffle(set.itemIds, createRng(base)).entries()) {
    if (steps.length === SET_SIZE) break;
    const step = prepareStep({ kind: set.type as ExerciseKind, itemIds: [itemId], seed: base + i }, index, `${set.id}-${round}-${i}`);
    if (step) steps.push(step);
  }
  return steps;
}

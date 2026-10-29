import type { ContentItem, ContentItemOf } from "@/content/schema";
import type { LessonContent } from "@/learning/lesson-plan";
import { LEVELS, type Level } from "@/learning/types";

type Word = ContentItemOf<"word">;
type Grammar = ContentItemOf<"grammar">;
type Forms = ContentItemOf<"forms">;
type Sentence = ContentItemOf<"sentence">;
type VocabSet = ContentItemOf<"set">;

/** A specialized vocabulary set with its words resolved, in learning order. */
export interface IndexedSet {
  item: VocabSet;
  words: readonly Word[];
}

/** Lookups over the loaded content, shared by the planner and the step builder. */
export interface ContentIndex {
  byId: ReadonlyMap<string, ContentItem>;
  wordsByLevel: Partial<Record<Level, readonly Word[]>>;
  grammarByLevel: Partial<Record<Level, readonly Grammar[]>>;
  /** Irregular verbs' forms (feature 008), by level, sort, then id. */
  forms: readonly Forms[];
  /** Specialized vocabulary sets (feature 012), by sort then id. */
  sets: readonly IndexedSet[];
  /** Word id → ids of the sets it belongs to. */
  setsByWord: ReadonlyMap<string, readonly string[]>;
  lesson: LessonContent;
}

const bySortThenId = (a: ContentItem, b: ContentItem) => a.sort - b.sort || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildContentIndex(items: readonly ContentItem[], tombstones: ReadonlySet<string> = new Set()): ContentIndex {
  const live = items.filter((item) => !tombstones.has(item.id));
  const byId = new Map<string, ContentItem>(live.map((item) => [item.id, item]));
  const setItems = live.filter((item): item is VocabSet => item.kind === "set").sort(bySortThenId);
  // A set carries its words and examples so it works whatever levels are
  // loaded. They join `byId` only (a loaded level item wins), never the level
  // lists, so level counts and the level fallback stay exact.
  const setSentences = new Map<string, Sentence>();
  for (const set of setItems) {
    for (const embedded of [...set.body.words, ...set.body.sentences]) {
      if (tombstones.has(embedded.id) || byId.has(embedded.id)) continue;
      byId.set(embedded.id, embedded);
    }
  }
  for (const set of setItems) {
    for (const sentence of set.body.sentences) {
      const item = byId.get(sentence.id);
      if (item?.kind === "sentence") setSentences.set(item.id, item);
    }
  }
  const sets: IndexedSet[] = setItems.map((item) => ({
    item,
    words: item.body.wordIds.flatMap((id) => {
      const word = byId.get(id);
      return word?.kind === "word" ? [word] : [];
    }),
  }));
  const setsByWord = new Map<string, string[]>();
  for (const set of sets) for (const word of set.words) setsByWord.set(word.id, [...(setsByWord.get(word.id) ?? []), set.item.id]);

  const wordsByLevel: Partial<Record<Level, Word[]>> = {};
  const grammarByLevel: Partial<Record<Level, Grammar[]>> = {};
  for (const level of LEVELS) {
    wordsByLevel[level] = live.filter((item): item is Word => item.kind === "word" && item.level === level).sort(bySortThenId);
    grammarByLevel[level] = live.filter((item): item is Grammar => item.kind === "grammar" && item.level === level).sort(bySortThenId);
  }
  return {
    byId,
    wordsByLevel,
    grammarByLevel,
    forms: live.filter((item): item is Forms => item.kind === "forms").sort((a, b) => a.level.localeCompare(b.level) || bySortThenId(a, b)),
    sets,
    setsByWord,
    lesson: {
      wordsByLevel,
      grammarByLevel,
      sentences: live.filter((item) => item.kind === "sentence"),
      writing: live.filter((item) => item.kind === "writing"),
      skip: tombstones,
      setWords: new Map(sets.map((set) => [set.item.id, set.words])),
      setSentences: [...setSentences.values()],
    },
  };
}

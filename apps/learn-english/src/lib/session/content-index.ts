import type { ContentItem, ContentItemOf } from "@/content/schema";
import type { LessonContent } from "@/learning/lesson-plan";
import { LEVELS, type Level } from "@/learning/types";

type Word = ContentItemOf<"word">;
type Grammar = ContentItemOf<"grammar">;

/** Lookups over the loaded content, shared by the planner and the step builder. */
export interface ContentIndex {
  byId: ReadonlyMap<string, ContentItem>;
  wordsByLevel: Partial<Record<Level, readonly Word[]>>;
  grammarByLevel: Partial<Record<Level, readonly Grammar[]>>;
  lesson: LessonContent;
}

const bySortThenId = (a: ContentItem, b: ContentItem) => a.sort - b.sort || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function buildContentIndex(items: readonly ContentItem[], tombstones: ReadonlySet<string> = new Set()): ContentIndex {
  const live = items.filter((item) => !tombstones.has(item.id));
  const byId = new Map(live.map((item) => [item.id, item]));
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
    lesson: {
      wordsByLevel,
      grammarByLevel,
      sentences: live.filter((item) => item.kind === "sentence"),
      writing: live.filter((item) => item.kind === "writing"),
      skip: tombstones,
    },
  };
}

import type { ContentItemOf } from "@/content/schema";
import { localDate } from "@/learning/attendance";
import { dueCards, hashString, REVIEW_CAP, reviewExercises } from "@/learning/lesson-plan";
import type { ExerciseDescriptor, Profile, StoredCard } from "@/learning/types";
import type { ContentIndex } from "./content-index";

export interface ReviewQueue {
  due: StoredCard[];
  /** Earliest upcoming due time when nothing is due today. */
  nextDue?: number;
}

/** Cards due by the end of today, most likely forgotten first (AC-011). */
export function reviewQueue(cards: readonly StoredCard[], profile: Pick<Profile, "level" | "timeZone">, index: ContentIndex, now: number): ReviewQueue {
  const date = localDate(now, profile.timeZone);
  const due = dueCards({ date, now, profile, cards, content: index.lesson });
  const upcoming = cards.filter((card) => !due.includes(card) && !index.lesson.skip.has(card.itemId)).map((card) => card.due);
  return { due, nextDue: due.length === 0 && upcoming.length ? Math.min(...upcoming) : undefined };
}

/** One session's exercises: up to REVIEW_CAP due items, kinds varied per item. */
export function reviewSession(due: readonly StoredCard[], index: ContentIndex, now: number): ExerciseDescriptor[] {
  const wordsById = new Map<string, ContentItemOf<"word">>();
  for (const item of index.byId.values()) if (item.kind === "word") wordsById.set(item.id, item);
  const base = hashString(String(Math.floor(now / 60_000)));
  const audioOf = (id: string) => {
    const item = index.byId.get(id);
    return item?.kind === "forms" ? item.body.audio : "";
  };
  return reviewExercises(due.slice(0, REVIEW_CAP), wordsById, (i, itemId) => hashString(`${base}|review|${i}|${itemId}`), audioOf);
}

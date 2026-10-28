import type { ContentIndex } from "@/lib/session/content-index";
import { LEVELS, type Attempt, type Level, type StoredCard } from "@/learning/types";

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** "2026-10-27" → "27/10". */
export function dayMonth(date: string): string {
  return `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`;
}

/** Monday of the week that contains `date` (local "YYYY-MM-DD" in, same out). */
export function weekStart(date: string): string {
  const ms = toUtc(date);
  const weekday = (new Date(ms).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  return fromUtc(ms - weekday * DAY_MS);
}

export interface CalendarDay {
  date: string;
  attended: boolean;
  /** After today: drawn as an empty slot. */
  future: boolean;
}

/** `weeks` columns of 7 days (Monday first), the last column holding `today`. */
export function calendarWeeks(attendedDates: ReadonlySet<string>, today: string, weeks = 12): CalendarDay[][] {
  const first = toUtc(weekStart(today)) - (weeks - 1) * 7 * DAY_MS;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = fromUtc(first + (w * 7 + d) * DAY_MS);
      return { date, attended: attendedDates.has(date), future: date > today };
    }),
  );
}

export interface LevelCount {
  level: Level;
  learned: number;
  total: number;
  /** When the most recently added of the learned items was first learned (ms); undefined with none. */
  lastLearnedAt?: number;
}

export type ProgressKind = "word" | "grammar" | "forms";

/** Cards per level for one item kind, joined with the content's levels; unknown items are skipped. */
export function countByLevel(cards: readonly StoredCard[], index: ContentIndex, kind: ProgressKind): LevelCount[] {
  const learned = new Map<Level, number>();
  const lastLearnedAt = new Map<Level, number>();
  for (const card of cards) {
    if (!card.itemId.startsWith(`${kind}:`)) continue;
    const item = index.byId.get(card.itemId);
    if (item?.kind !== kind) continue;
    learned.set(item.level, (learned.get(item.level) ?? 0) + 1);
    lastLearnedAt.set(item.level, Math.max(lastLearnedAt.get(item.level) ?? 0, card.addedAt));
  }
  const total = (level: Level) =>
    kind === "word" ? (index.wordsByLevel[level]?.length ?? 0) : kind === "grammar" ? (index.grammarByLevel[level]?.length ?? 0) : index.forms.filter((item) => item.level === level).length;
  return LEVELS.map((level) => ({ level, learned: learned.get(level) ?? 0, total: total(level), lastLearnedAt: lastLearnedAt.get(level) }));
}

export interface Accuracy {
  correct: number;
  total: number;
}

export interface WeekAccuracy extends Accuracy {
  /** Monday of the week, local "YYYY-MM-DD". */
  week: string;
}

/** Correct / total over the given attempts (placement answers excluded), overall and per calendar week. */
export function accuracy(attempts: readonly Attempt[], toLocalDate: (at: number) => string): { overall: Accuracy; weeks: WeekAccuracy[] } {
  const overall = { correct: 0, total: 0 };
  const byWeek = new Map<string, Accuracy>();
  for (const attempt of attempts) {
    if (attempt.context === "placement") continue;
    const week = weekStart(toLocalDate(attempt.at));
    const bucket = byWeek.get(week) ?? { correct: 0, total: 0 };
    bucket.total++;
    overall.total++;
    if (attempt.correct) {
      bucket.correct++;
      overall.correct++;
    }
    byWeek.set(week, bucket);
  }
  const weeks = [...byWeek].map(([week, value]) => ({ week, ...value })).sort((a, b) => a.week.localeCompare(b.week));
  return { overall, weeks };
}

export function percent({ correct, total }: Accuracy): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

import { localDate } from "@/learning/attendance";
import type { ExerciseKind, Profile } from "@/learning/types";
import {
  COUNTED_EXERCISE_KINDS,
  MAX_WRONG_WORDS,
  WORD_ID_PATTERN,
  type CountedExerciseKind,
  type StatsPayload,
} from "@/server/stats/stats.schema";
import { getProfile } from "@/storage/meta";
import { emptyDay, updateStats, type DayCounts, type StatsToday } from "./stats-store";

// Anonymous usage stats (AC-056, AC-057). Counts are kept per local day in
// IndexedDB and reported with `sendBeacon`: the previous day's remainder when
// a new day starts, and today's new counts whenever the page is hidden. With
// "Gửi thống kê ẩn danh" off (profile.statsOptOut) nothing is counted or sent.
// Every function swallows its errors: stats must never block learning.

export const STATS_URL = "/api/stats";

// The server's per-report limits; counts above them are capped, not rejected.
const MAX_LESSONS = 20;
const MAX_EXERCISES = 2000;
const MAX_WRONG_PER_WORD = 200;

const COUNTED = new Set<string>(COUNTED_EXERCISE_KINDS);

/** The profile when stats are on; undefined when they are off or there is no profile yet. */
async function activeProfile(): Promise<Profile | undefined> {
  const profile = await getProfile();
  return profile && !profile.statsOptOut ? profile : undefined;
}

/** What `total` adds over `sent`, capped to the server limits; undefined when there is nothing new. */
export function deltaOf({ total, sent }: StatsToday): Omit<StatsPayload, "day" | "deviceId"> | undefined {
  const exercises: StatsPayload["exercises"] = {};
  for (const [kind, count] of Object.entries(total.exercises) as [CountedExerciseKind, number][]) {
    const diff = count - (sent.exercises[kind] ?? 0);
    if (diff > 0) exercises[kind] = Math.min(diff, MAX_EXERCISES);
  }
  const words = Object.entries(total.wrongWords)
    .map(([id, count]) => [id, Math.min(count - (sent.wrongWords[id] ?? 0), MAX_WRONG_PER_WORD)] as const)
    .filter(([, diff]) => diff > 0)
    .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
    .slice(0, MAX_WRONG_WORDS);
  const delta = {
    lessonsCompleted: Math.min(Math.max(total.lessonsCompleted - sent.lessonsCompleted, 0), MAX_LESSONS),
    placementDone: total.placementDone && !sent.placementDone,
    exercises,
    wrongWords: Object.fromEntries(words),
  };
  const empty = !delta.lessonsCompleted && !delta.placementDone && !Object.keys(exercises).length && !words.length;
  return empty ? undefined : delta;
}

/** Fire-and-forget: a beacon, or a keepalive fetch when the beacon isn't queued. Failures are dropped. */
function send(payload: StatsPayload): void {
  try {
    const body = JSON.stringify(payload);
    const queued = typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
      && navigator.sendBeacon(STATS_URL, new Blob([body], { type: "application/json" }));
    if (!queued) {
      void fetch(STATS_URL, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    }
  } catch {
    // Dropped silently (spec edge case).
  }
}

/** The unsent part of `record` as a report (undefined when there is nothing new). */
function takeReport(record: StatsToday, deviceId: string): StatsPayload | undefined {
  const delta = deltaOf(record);
  return delta && { day: record.day, deviceId, ...delta };
}

const sentAll = (record: StatsToday): StatsToday => ({ ...record, sent: structuredClone(record.total) });

/**
 * Applies `count` to today's counters. If the stored counters belong to
 * another day, their unsent remainder is reported first and they start over.
 */
async function count(now: number, apply: (counts: DayCounts) => void): Promise<void> {
  try {
    const profile = await activeProfile();
    if (!profile) return;
    const today = localDate(now, profile.timeZone);
    const report = await updateStats((current) => {
      const old = current && current.day !== today ? takeReport(current, profile.deviceId) : undefined;
      const next = current?.day === today ? structuredClone(current) : emptyDay(today);
      apply(next.total);
      return { next, result: old };
    });
    if (report) send(report);
  } catch {
    // Never block learning.
  }
}

/** Counts one checked answer, and the word when it was answered wrong. */
export function countAttempt({ exercise, itemId, correct }: { exercise: ExerciseKind; itemId: string; correct: boolean }, now: number = Date.now()): Promise<void> {
  if (!COUNTED.has(exercise)) return Promise.resolve();
  return count(now, (counts) => {
    const kind = exercise as CountedExerciseKind;
    counts.exercises[kind] = (counts.exercises[kind] ?? 0) + 1;
    if (!correct && WORD_ID_PATTERN.test(itemId)) counts.wrongWords[itemId] = (counts.wrongWords[itemId] ?? 0) + 1;
  });
}

export function countLessonCompleted(now: number = Date.now()): Promise<void> {
  return count(now, (counts) => {
    counts.lessonsCompleted += 1;
  });
}

export function countPlacementDone(now: number = Date.now()): Promise<void> {
  return count(now, (counts) => {
    counts.placementDone = true;
  });
}

/**
 * When the stored counters are from an earlier day, reports their unsent
 * remainder and starts today's from zero. `timeZone` defaults to the profile's.
 */
export async function flushIfNewDay(now: number = Date.now(), timeZone?: string): Promise<void> {
  try {
    const profile = await activeProfile();
    if (!profile) return;
    const today = localDate(now, timeZone ?? profile.timeZone);
    const report = await updateStats((current) => {
      if (!current || current.day === today) return { next: current ?? emptyDay(today), result: undefined };
      return { next: emptyDay(today), result: takeReport(current, profile.deviceId) };
    });
    if (report) send(report);
  } catch {
    // Never block learning.
  }
}

/** Reports today's counts not sent yet (on `visibilitychange: hidden`) and marks them sent. */
export async function flushOnHide(): Promise<void> {
  try {
    const profile = await activeProfile();
    if (!profile) return;
    const report = await updateStats((current) => {
      if (!current) return { next: emptyDay(localDate(Date.now(), profile.timeZone)), result: undefined };
      return { next: sentAll(current), result: takeReport(current, profile.deviceId) };
    });
    if (report) send(report);
  } catch {
    // Never block learning.
  }
}

import { localDate, pointsFor, streaks } from "@/learning/attendance";
import { buildLessonPlan } from "@/learning/lesson-plan";
import type { DailyLesson, LessonPartKind, Profile } from "@/learning/types";
import { addAttendance, getAllAttendance, type AddAttendanceResult } from "@/storage/attendance";
import { getAllCards } from "@/storage/cards";
import { getAllExtraLessons } from "@/storage/extra-lessons";
import { getAllLessons, getLesson, putLesson } from "@/storage/lessons";
import { countLessonCompleted } from "@/stats/stats-client";
import type { RunnerStep } from "@/components/exercise/exercise-runner";
import type { ContentIndex } from "./content-index";
import { prepareStep } from "./prepare";

export const PART_LABELS: Record<LessonPartKind, string> = {
  review: "Ôn tập",
  "new-words": "Từ mới",
  grammar: "Ngữ pháp",
  sentences: "Đặt câu",
  writing: "Bài viết",
};

const DAY_MS = 86_400_000;

export interface TodayInput {
  profile: Pick<Profile, "level" | "timeZone" | "vocabSet">;
  index: ContentIndex;
  contentVersion: number;
  now: number;
}

/** Writing tasks of the daily and extra lessons from the last 14 days, so a new plan avoids them. */
export function recentWritingIds(lessons: readonly Pick<DailyLesson, "date" | "plan">[], now: number, timeZone: string): string[] {
  const since = localDate(now - 14 * DAY_MS, timeZone);
  return lessons
    .filter((lesson) => lesson.date >= since)
    .flatMap((lesson) => lesson.plan.flatMap((part) => (part.kind === "writing" ? part.exercises.flatMap((e) => e.itemIds) : [])));
}

async function planToday({ profile, index, contentVersion, now }: TodayInput, date: string): Promise<DailyLesson> {
  const [cards, lessons, extras] = await Promise.all([getAllCards(), getAllLessons(), getAllExtraLessons()]);
  const writingIds = recentWritingIds([...lessons, ...extras], now, profile.timeZone);
  const lesson = buildLessonPlan({ date, now, profile, cards, content: index.lesson, contentVersion, recentWritingIds: writingIds });
  await putLesson(lesson);
  return lesson;
}

/** Today's lesson for this learner, planned once per local date and stored (AC-016). */
export async function getOrCreateTodayLesson(input: TodayInput): Promise<DailyLesson> {
  const date = localDate(input.now, input.profile.timeZone);
  return (await getLesson(date)) ?? planToday(input, date);
}

const isUnstarted = (lesson: DailyLesson) => !lesson.completedAt && lesson.position.part === 0 && lesson.position.index === 0;

/**
 * After following or unfollowing a vocabulary set (feature 012): plans
 * today's lesson again when nothing in it is done yet, so it takes the new
 * words. The new plan is stamped `now`, so it also wins a sync merge over the
 * old one. Returns false when today's lesson is under way and was kept: the
 * change applies from tomorrow.
 */
export async function replanTodayIfUnstarted(input: TodayInput): Promise<boolean> {
  const date = localDate(input.now, input.profile.timeZone);
  const existing = await getLesson(date);
  if (!existing) return true;
  if (!isUnstarted(existing)) return false;
  await planToday(input, date);
  return true;
}

export interface FlatLesson {
  steps: RunnerStep[];
  /** Plan position of each step, for saving progress. */
  positions: DailyLesson["position"][];
  /** First step not done yet. */
  startAt: number;
}

const comparePosition = (a: DailyLesson["position"], b: DailyLesson["position"]) => a.part - b.part || a.index - b.index;

/** What the runner needs from a daily or extra lesson (feature 013); `id` keys an extra lesson's steps. */
export type PlayableLesson = Pick<DailyLesson, "date" | "plan" | "position"> & { id?: string };

/** Runner steps for the whole lesson, skipping exercises whose content is gone. */
export function flattenLesson(lesson: PlayableLesson, index: ContentIndex): FlatLesson {
  const steps: RunnerStep[] = [];
  const positions: DailyLesson["position"][] = [];
  lesson.plan.forEach((part, partIndex) => {
    part.exercises.forEach((descriptor, exerciseIndex) => {
      const step = prepareStep(descriptor, index, `${lesson.id ?? lesson.date}-${partIndex}-${exerciseIndex}`);
      if (!step) return;
      steps.push(step);
      positions.push({ part: partIndex, index: exerciseIndex });
    });
  });
  const startAt = positions.findIndex((position) => comparePosition(position, lesson.position) >= 0);
  return { steps, positions, startAt: startAt === -1 ? steps.length : startAt };
}

/** Plan position after the last step (the lesson is finished). */
export function endPosition(lesson: Pick<DailyLesson, "plan">): DailyLesson["position"] {
  return { part: lesson.plan.length, index: 0 };
}

export async function saveLessonPosition(date: string, position: DailyLesson["position"], now: number): Promise<void> {
  const lesson = await getLesson(date);
  if (lesson && comparePosition(position, lesson.position) > 0) await putLesson({ ...lesson, position, updatedAt: now });
}

export interface Completion {
  result: AddAttendanceResult;
  points: number;
  bonus: number;
  streak: number;
}

/**
 * Marks the lesson complete and awards attendance once per day (AC-015). A
 * second tab finishing the same lesson gets "already-awarded" and no points.
 */
export async function completeLesson(lesson: DailyLesson, now: number): Promise<Completion> {
  const today = lesson.date;
  const attendance = await getAllAttendance();
  const streak = streaks([...attendance.map((row) => row.date), today], today).current;
  const { points, bonus } = pointsFor(streak);
  const result = await addAttendance({ date: today, points, bonus, at: now });
  const stored = (await getLesson(today)) ?? lesson;
  if (result === "awarded") await countLessonCompleted(now);
  if (!stored.completedAt) await putLesson({ ...stored, position: endPosition(stored), completedAt: now, updatedAt: now });
  return result === "awarded" ? { result, points, bonus, streak } : { result, points: 0, bonus: 0, streak };
}

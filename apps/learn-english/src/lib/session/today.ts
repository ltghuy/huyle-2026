import { localDate, pointsFor, streaks } from "@/learning/attendance";
import { buildLessonPlan } from "@/learning/lesson-plan";
import type { DailyLesson, LessonPartKind, Profile } from "@/learning/types";
import { addAttendance, getAllAttendance, type AddAttendanceResult } from "@/storage/attendance";
import { getAllCards } from "@/storage/cards";
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

/** Today's lesson for this learner, planned once per local date and stored (AC-016). */
export async function getOrCreateTodayLesson(input: {
  profile: Pick<Profile, "level" | "timeZone">;
  index: ContentIndex;
  contentVersion: number;
  now: number;
}): Promise<DailyLesson> {
  const { profile, index, contentVersion, now } = input;
  const date = localDate(now, profile.timeZone);
  const existing = await getLesson(date);
  if (existing) return existing;

  const [cards, lessons] = await Promise.all([getAllCards(), getAllLessons()]);
  const since = localDate(now - 14 * DAY_MS, profile.timeZone);
  const recentWritingIds = lessons
    .filter((lesson) => lesson.date >= since)
    .flatMap((lesson) => lesson.plan.flatMap((part) => (part.kind === "writing" ? part.exercises.flatMap((e) => e.itemIds) : [])));
  const lesson = buildLessonPlan({ date, now, profile, cards, content: index.lesson, contentVersion, recentWritingIds });
  await putLesson(lesson);
  return lesson;
}

export interface FlatLesson {
  steps: RunnerStep[];
  /** Plan position of each step, for saving progress. */
  positions: DailyLesson["position"][];
  /** First step not done yet. */
  startAt: number;
}

const comparePosition = (a: DailyLesson["position"], b: DailyLesson["position"]) => a.part - b.part || a.index - b.index;

/** Runner steps for the whole lesson, skipping exercises whose content is gone. */
export function flattenLesson(lesson: DailyLesson, index: ContentIndex): FlatLesson {
  const steps: RunnerStep[] = [];
  const positions: DailyLesson["position"][] = [];
  lesson.plan.forEach((part, partIndex) => {
    part.exercises.forEach((descriptor, exerciseIndex) => {
      const step = prepareStep(descriptor, index, `${lesson.date}-${partIndex}-${exerciseIndex}`);
      if (!step) return;
      steps.push(step);
      positions.push({ part: partIndex, index: exerciseIndex });
    });
  });
  const startAt = positions.findIndex((position) => comparePosition(position, lesson.position) >= 0);
  return { steps, positions, startAt: startAt === -1 ? steps.length : startAt };
}

/** Plan position after the last step (the lesson is finished). */
export function endPosition(lesson: DailyLesson): DailyLesson["position"] {
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

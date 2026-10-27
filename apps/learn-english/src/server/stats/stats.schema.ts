import { z } from "zod";
import { EXERCISE_KINDS, type ExerciseKind } from "@/learning/types";

// Request shape of `POST /api/stats`, shared by the route handler and the
// stats client (no `server-only` here).

/** Exercise kinds that produce attempts ("study" cards never do). */
export const COUNTED_EXERCISE_KINDS = EXERCISE_KINDS.filter(
  (kind): kind is Exclude<ExerciseKind, "study"> => kind !== "study",
);
export type CountedExerciseKind = (typeof COUNTED_EXERCISE_KINDS)[number];

/** Most wrong-word keys stored per beacon; the largest counts are kept. */
export const MAX_WRONG_WORDS = 20;
/** Upper bound on keys the server will even look at (cheap guard on CPU). */
const MAX_WRONG_WORD_KEYS = 200;
/** A report may be for a day at most this far from the server's UTC day (time zones, late beacons). */
export const MAX_DAY_DISTANCE = 2;
/** Largest request body the handler reads. */
export const MAX_STATS_BODY_BYTES = 8 * 1024;

export const WORD_ID_PATTERN = /^word:[a-z0-9][a-z0-9-]*$/;

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => !Number.isNaN(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().startsWith(day), {
    message: "not a calendar day",
  });

export const statsPayloadSchema = z.object({
  day: daySchema,
  deviceId: z.string().regex(/^[0-9A-Za-z-]{8,64}$/),
  lessonsCompleted: z.number().int().min(0).max(20),
  placementDone: z.boolean(),
  exercises: z.partialRecord(z.enum(COUNTED_EXERCISE_KINDS), z.number().int().min(0).max(2000)),
  wrongWords: z
    .record(z.string().regex(WORD_ID_PATTERN), z.number().int().min(1).max(200))
    .refine((words) => Object.keys(words).length <= MAX_WRONG_WORD_KEYS, { message: "too many words" }),
});

export type StatsPayload = z.infer<typeof statsPayloadSchema>;

const DAY_MS = 86_400_000;

/** Whether `day` is within `MAX_DAY_DISTANCE` days of the UTC day of `now`. */
export function isDayInRange(day: string, now: number): boolean {
  const today = Date.parse(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z");
  const distance = Math.abs(Date.parse(`${day}T00:00:00Z`) - today) / DAY_MS;
  return distance <= MAX_DAY_DISTANCE;
}

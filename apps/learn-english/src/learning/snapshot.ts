import { z } from "zod";
import { localDate, streaks, totalPoints } from "./attendance";
import { NAME_MAX_LENGTH } from "./name";
import {
  EXERCISE_KINDS,
  LEVELS,
  type Attempt,
  type Attendance,
  type DailyLesson,
  type Profile,
  type StoredCard,
} from "./types";

export const SNAPSHOT_APP = "learn-english";
export const SNAPSHOT_VERSION = 1;

const DAY_MS = 24 * 60 * 60 * 1000;
const LESSON_DAYS = 14;
const ATTEMPT_DAYS = 30;
const OLD_ATTEMPTS_PER_ITEM = 8;

/** Everything the learner stores in this browser. */
export interface LearnerState {
  profile: Profile;
  cards: StoredCard[];
  attendance: Attendance[];
  lessons: DailyLesson[];
  attempts: Attempt[];
}

/**
 * The profile as it leaves the device. The per-browser id and the sync state
 * stay behind: the sync code works like a password, and `rev`/`dirty` describe
 * this device only.
 */
export type SnapshotMeta = Omit<Profile, "deviceId" | "sync">;

export interface SnapshotData {
  meta: SnapshotMeta;
  cards: StoredCard[];
  attendance: Attendance[];
  lessons: DailyLesson[];
  attempts: Attempt[];
}

export interface Snapshot {
  app: typeof SNAPSHOT_APP;
  version: typeof SNAPSHOT_VERSION;
  exportedAt: number;
  summary: { wordsLearned: number; points: number; streak: number };
  data: SnapshotData;
}

const PROFILE_KEYS = [
  "displayName",
  "level",
  "placement",
  "placementResult",
  "tourSeen",
  "createdAt",
  "timeZone",
  "lastBackupAt",
  "sync",
  "statsOptOut",
  "deviceId",
  "schemaVersion",
  "fieldUpdatedAt",
] as const satisfies readonly (keyof Profile)[];

const time = z.number().finite();
const count = z.number().int().nonnegative();
const level = z.enum(LEVELS);

const cardSchema = z.object({
  itemId: z.union([z.templateLiteral(["word:", z.string()]), z.templateLiteral(["grammar:", z.string()])]),
  due: time,
  stability: z.number(),
  difficulty: z.number(),
  elapsed_days: z.number(),
  scheduled_days: z.number(),
  learning_steps: z.number(),
  reps: count,
  lapses: count,
  state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  last_review: time.optional(),
  addedAt: time,
  updatedAt: time,
}) satisfies z.ZodType<StoredCard>;

const attemptSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  at: time,
  correct: z.boolean(),
  ms: z.number().nonnegative(),
  hinted: z.boolean(),
  typo: z.boolean(),
  selfMarked: z.boolean(),
  exercise: z.enum(EXERCISE_KINDS),
  context: z.enum(["lesson", "review", "exercise", "placement"]),
  rating: z.enum(["again", "hard", "good"]),
}) satisfies z.ZodType<Attempt>;

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const lessonSchema = z.object({
  date: localDateSchema,
  contentVersion: count,
  plan: z.array(
    z.object({
      kind: z.enum(["review", "new-words", "grammar", "sentences", "writing"]),
      exercises: z.array(z.object({ kind: z.enum(EXERCISE_KINDS), itemIds: z.array(z.string()), seed: z.number() })),
    }),
  ),
  position: z.object({ part: count, index: count }),
  completedAt: time.optional(),
  updatedAt: time,
}) satisfies z.ZodType<DailyLesson>;

const attendanceSchema = z.object({
  date: localDateSchema,
  points: count,
  bonus: count,
  at: time,
}) satisfies z.ZodType<Attendance>;

// Unknown keys (deviceId and sync included) are stripped by z.object.
const metaSchema = z.object({
  // Code units, not characters: a name of 40 characters can be longer in UTF-16.
  displayName: z.string().trim().min(1).max(NAME_MAX_LENGTH * 2).optional(),
  level,
  placement: z.enum(["pending", "skipped", "done"]),
  placementResult: level.optional(),
  tourSeen: z.boolean(),
  createdAt: time,
  timeZone: z.string().min(1),
  lastBackupAt: time.optional(),
  statsOptOut: z.boolean(),
  schemaVersion: count,
  fieldUpdatedAt: z.partialRecord(z.enum(PROFILE_KEYS), time),
}) satisfies z.ZodType<SnapshotMeta>;

export const snapshotSchema = z.object({
  app: z.literal(SNAPSHOT_APP),
  version: z.literal(SNAPSHOT_VERSION),
  exportedAt: time,
  summary: z.object({ wordsLearned: count, points: count, streak: count }),
  data: z.object({
    meta: metaSchema,
    cards: z.array(cardSchema),
    attendance: z.array(attendanceSchema),
    lessons: z.array(lessonSchema),
    attempts: z.array(attemptSchema),
  }),
}) satisfies z.ZodType<Snapshot>;

/** The profile without the device-only fields (`deviceId`, `sync`). */
export function toSnapshotMeta(profile: Profile): SnapshotMeta {
  const meta: Partial<Profile> = { ...profile, fieldUpdatedAt: { ...profile.fieldUpdatedAt } };
  delete meta.deviceId;
  delete meta.sync;
  delete meta.fieldUpdatedAt!.deviceId;
  delete meta.fieldUpdatedAt!.sync;
  return meta as SnapshotMeta;
}

// Four decimals are far below what changes a schedule, and keep a heavy
// profile's gzipped snapshot well under the 1 MB sync limit.
const round4 = (value: number) => Math.round(value * 1e4) / 1e4;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS).toISOString().slice(0, 10);
}

/** All attempts from the last 30 days, plus the latest 8 per item before that. */
function trimAttempts(attempts: readonly Attempt[], now: number): Attempt[] {
  const cutoff = now - ATTEMPT_DAYS * DAY_MS;
  const olderByItem = new Map<string, Attempt[]>();
  const kept: Attempt[] = [];
  for (const attempt of attempts) {
    if (attempt.at >= cutoff) kept.push(attempt);
    else {
      const older = olderByItem.get(attempt.itemId);
      if (older) older.push(attempt);
      else olderByItem.set(attempt.itemId, [attempt]);
    }
  }
  for (const older of olderByItem.values()) {
    kept.push(...older.sort((a, b) => a.at - b.at).slice(-OLD_ATTEMPTS_PER_ITEM));
  }
  return kept.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

export function summarize(data: Pick<SnapshotData, "cards" | "attendance">, today: string): Snapshot["summary"] {
  return {
    wordsLearned: data.cards.filter((card) => card.itemId.startsWith("word:")).length,
    points: totalPoints(data.attendance),
    streak: streaks(
      data.attendance.map((row) => row.date),
      today,
    ).current,
  };
}

/** The backup/sync payload: trimmed learner state, without the device-only fields. */
export function buildSnapshot(state: LearnerState, now: number, timeZone: string): Snapshot {
  const today = localDate(now, timeZone);
  const firstLessonDate = addDays(today, -(LESSON_DAYS - 1));
  const data: SnapshotData = {
    meta: toSnapshotMeta(state.profile),
    cards: state.cards.map((card) => ({ ...card, stability: round4(card.stability), difficulty: round4(card.difficulty) })),
    attendance: state.attendance,
    lessons: state.lessons.filter((lesson) => lesson.date >= firstLessonDate),
    attempts: trimAttempts(state.attempts, now),
  };
  return { app: SNAPSHOT_APP, version: SNAPSHOT_VERSION, exportedAt: now, summary: summarize(data, today), data };
}

export type ParseResult =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; reason: "invalid" | "newer-version" | "not-a-backup" };

/** Upgrades a raw snapshot object from `fromVersion` to `fromVersion + 1`. */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Keyed by the version they upgrade from. Version 1 is the first, so none yet. */
export const MIGRATIONS: Record<number, Migration> = {};

/** Validates a backup file (text or parsed JSON), upgrading older versions. */
export function parseSnapshot(input: unknown, migrations: Record<number, Migration> = MIGRATIONS): ParseResult {
  let raw = input;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "invalid" };
    }
  }
  if (typeof raw !== "object" || raw === null || (raw as { app?: unknown }).app !== SNAPSHOT_APP) {
    return { ok: false, reason: "not-a-backup" };
  }

  let current = raw as Record<string, unknown>;
  let version = current.version;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    return { ok: false, reason: "invalid" };
  }
  if (version > SNAPSHOT_VERSION) return { ok: false, reason: "newer-version" };
  try {
    while (version < SNAPSHOT_VERSION) {
      const migrate = migrations[version];
      if (!migrate) return { ok: false, reason: "invalid" };
      current = { ...migrate(current), version: version + 1 };
      version += 1;
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const parsed = snapshotSchema.safeParse(current);
  return parsed.success ? { ok: true, snapshot: parsed.data } : { ok: false, reason: "invalid" };
}

async function transform(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // Not awaited: the writes only finish once the readable side is drained below.
  writer.write(bytes as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Gzipped JSON of the snapshot (the sync payload). */
export function encodeSnapshot(snapshot: Snapshot): Promise<Uint8Array> {
  return transform(new TextEncoder().encode(JSON.stringify(snapshot)), new CompressionStream("gzip"));
}

/** Gunzips and validates a payload; anything unreadable is "invalid". */
export async function decodeSnapshot(bytes: Uint8Array): Promise<ParseResult> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await transform(bytes, new DecompressionStream("gzip")));
  } catch {
    return { ok: false, reason: "invalid" };
  }
  return parseSnapshot(text);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Throws on malformed base64. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Shared learner-state types. Plain data only: these are what IndexedDB
// stores, what snapshots serialize and what the pure learning modules take.
// Times are epoch milliseconds; local dates are "YYYY-MM-DD" strings in the
// learner's time zone.

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];

/** `word:<id>` or `grammar:<slug>`: the items that get a review schedule. */
export type CardItemId = `word:${string}` | `grammar:${string}` | `forms:${string}`;

/** ts-fsrs card state (State enum: 0 New, 1 Learning, 2 Review, 3 Relearning). */
export type CardStateValue = 0 | 1 | 2 | 3;

/** A ts-fsrs 5.4.2 card with dates as epoch ms, plus our bookkeeping. */
export interface StoredCard {
  itemId: CardItemId;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: CardStateValue;
  last_review?: number;
  addedAt: number;
  updatedAt: number;
}

export const EXERCISE_KINDS = [
  "mcq",
  "missing-letters",
  "listening",
  "recall",
  "grammar-gap",
  "word-order",
  "sentence-gap",
  "choose-sentence",
  "tile-translate",
  "writing",
  // Hear a sentence and type it (feature 010).
  "dictation",
  // An irregular verb's past and participle (feature 008).
  "forms-typing",
  "forms-gap",
  "forms-listening",
  // A word or grammar card shown before its check; never produces an attempt.
  "study",
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export type AttemptContext = "lesson" | "review" | "exercise" | "placement";

export type RatingName = "again" | "hard" | "good";

export interface Attempt {
  /** Random UUID, so attempts from two devices can be merged by union. */
  id: string;
  itemId: string;
  at: number;
  correct: boolean;
  /** Response time in milliseconds. */
  ms: number;
  hinted: boolean;
  typo: boolean;
  /** The learner judged their own answer (free writing). */
  selfMarked: boolean;
  exercise: ExerciseKind;
  context: AttemptContext;
  rating: RatingName;
}

export type LessonPartKind = "review" | "new-words" | "grammar" | "sentences" | "writing";

export interface ExerciseDescriptor {
  kind: ExerciseKind;
  /** Content item ids the exercise is built from (first one is the target). */
  itemIds: string[];
  /** Seed for the deterministic variant (blanks, option order, tiles). */
  seed: number;
}

export interface LessonPart {
  kind: LessonPartKind;
  exercises: ExerciseDescriptor[];
}

export interface DailyLesson {
  date: string;
  contentVersion: number;
  plan: LessonPart[];
  position: { part: number; index: number };
  completedAt?: number;
  updatedAt: number;
}

export interface Attendance {
  date: string;
  points: number;
  bonus: number;
  at: number;
}

export type PlacementStatus = "pending" | "skipped" | "done";

export interface SyncState {
  code: string;
  rev: number;
  lastSyncedAt?: number;
  dirty: boolean;
}

export interface Profile {
  /** The learner's name (feature 003); missing until the first-visit prompt is answered. */
  displayName?: string;
  level: Level;
  placement: PlacementStatus;
  placementResult?: Level;
  tourSeen: boolean;
  createdAt: number;
  timeZone: string;
  lastBackupAt?: number;
  sync?: SyncState;
  statsOptOut: boolean;
  /**
   * The weekly leaderboard (feature 007): undefined until the learner answers
   * the consent question. `id` and `token` (the entry's secret) travel in
   * backups and sync, so the learner's devices share one entry.
   */
  leaderboard?: LeaderboardState;
  /** Random per-browser id; only ever sent hashed with the day (usage stats). */
  deviceId: string;
  schemaVersion: number;
  /** Last change time per field, for last-writer-wins merging across devices. */
  fieldUpdatedAt: Partial<Record<keyof Profile, number>>;
}

export type LeaderboardState = { status: "declined" } | { status: "joined"; id: string; token: string; name: string };

export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

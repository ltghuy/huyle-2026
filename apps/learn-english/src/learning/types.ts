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
  // Merged into word-order (feature 015): never planned or built any more, but
  // kept so saved lessons, attempts, sync snapshots and stats that recorded it still parse.
  "tile-translate",
  "writing",
  // Hear a sentence and type it (feature 010).
  "dictation",
  // Pick the underlined part that is wrong (feature 011).
  "find-error",
  // Read the Vietnamese, type the English; a wrong answer can be claimed (feature 016).
  "translate",
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

/**
 * Where a claim is: kept on the device until sent, then waiting for the
 * owner's decision. Only a rejection reaches the learner, once (`shown`).
 */
export const CLAIM_STATUSES = ["unsent", "pending", "approved", "dropped", "rejected", "shown"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
/** Who said the answer was right: the learner, or AI grading with their own key (feature 033). */
export const CLAIM_SOURCES = ["learner", "ai"] as const;
export type ClaimSource = (typeof CLAIM_SOURCES)[number];

/** A wrong translate answer the learner said is also correct (feature 016). */
export interface StoredClaim {
  /** Random UUID made on the device; the only reference shared with the server. */
  id: string;
  sentenceId: string;
  /** Trimmed, as typed. */
  answer: string;
  /** The sentence's English and Vietnamese, so the notice needs no content. */
  expected: string;
  vi: string;
  /** Cards to bring forward if the claim is rejected. */
  related: CardItemId[];
  createdAt: number;
  sentAt?: number;
  /** Last time the server was asked about this claim. */
  checkedAt?: number;
  status: ClaimStatus;
  /** The owner's explanation of a rejection. */
  explanationVi?: string;
  /** "ai" when AI grading accepted the answer (feature 033); missing means the learner claimed it. */
  source?: ClaimSource;
  /** Why the AI accepted it (feature 042), sent with the claim for the owner. */
  aiExplanationVi?: string;
  updatedAt: number;
}

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

/**
 * An extra lesson bought with points after the daily one (feature 013). The
 * row is also the spend record: its `price` counts against the balance even
 * after its plan is trimmed from old snapshots. `id` is `${date}#${n}#${random}`:
 * the purchase number that day on this device, and a random part so two
 * devices' purchases never collide when they merge.
 */
export interface ExtraLesson {
  id: string;
  date: string;
  price: number;
  purchasedAt: number;
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

/** A sync code link, left in profiles saved before feature 037 removed sync codes; never read. */
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
  /** @deprecated Left over from sync codes (removed in feature 037); kept so it never reaches a snapshot. */
  sync?: SyncState;
  statsOptOut: boolean;
  /**
   * The weekly leaderboard (feature 007): undefined until the learner answers
   * the consent question. `id` and `token` (the entry's secret) travel in
   * backups and sync, so the learner's devices share one entry.
   */
  leaderboard?: LeaderboardState;
  /** The followed specialized vocabulary set (feature 012), `set:<slug>`; its words come first in the daily lesson. */
  vocabSet?: string;
  /** Random per-browser id; only ever sent hashed with the day (usage stats). */
  deviceId: string;
  /**
   * The Google account this device's progress belongs to (feature 022), cached so the app knows the
   * learner offline. Device-only like `deviceId` and `sync`: never in backups, sync blobs or merges.
   */
  account?: AccountLink;
  schemaVersion: number;
  /** Last change time per field, for last-writer-wins merging across devices. */
  fieldUpdatedAt: Partial<Record<keyof Profile, number>>;
}

export interface AccountLink {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  /** When this device's progress was first sent to the account; missing while that move is pending (AC-018). */
  linkedAt?: number;
  /** The session ended (expired or signed out elsewhere); progress stays here until the learner signs in again (AC-006). */
  expired?: boolean;
  /** The account copy's revision this device last saw, as `SyncState.rev` for codes; 0 before the first upload. */
  rev?: number;
  lastSyncedAt?: number;
  /** Local changes the account doesn't have yet. */
  dirty?: boolean;
}

export type LeaderboardState = { status: "declined" } | { status: "joined"; id: string; token: string; name: string };

export const DEFAULT_TIME_ZONE = "Asia/Ho_Chi_Minh";

// The Arena's socket protocol (feature 023): room settings, the frames a player
// sends, and the frames and room view the room sends back. Pure and shared by
// the room (Durable Object) and the browser.
import { z } from "zod";
import { LEVELS } from "../types";

/** What the creator picks: one question type, or the three mixed ("Hỗn hợp"). */
export const ARENA_MODES = ["listen", "recall", "write", "mixed"] as const;
export type ArenaMode = (typeof ARENA_MODES)[number];

/** "Nghe và chọn từ", "Nhớ lại từ", "Viết câu". */
export const QUESTION_TYPES = ["listen", "recall", "write"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Seconds the host can give each question (feature 028). */
export const QUESTION_TIMES = [15, 25, 30, 45] as const;
export type QuestionTime = (typeof QUESTION_TIMES)[number];
/** The question time when none is chosen, also for requests from pages older than 028. */
export const DEFAULT_QUESTION_TIME: QuestionTime = 15;

export const settingsSchema = z.object({
  mode: z.enum(ARENA_MODES),
  level: z.enum(LEVELS),
  rounds: z.union([z.literal(1), z.literal(3)]),
  seconds: z.union([z.literal(15), z.literal(25), z.literal(30), z.literal(45)]).default(DEFAULT_QUESTION_TIME),
});
export type ArenaSettings = z.infer<typeof settingsSchema>;
/** A question's time in ms (feature 028). */
export function questionMs(settings: ArenaSettings): number {
  return settings.seconds * 1_000;
}
/** A past match's settings: history doesn't record the question time (028). */
export type MatchSettings = Omit<ArenaSettings, "seconds">;

/** Room codes: 6 characters without look-alikes (no 0/O, 1/I/L). */
export const CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/** A frame longer than this closes the socket (1009); typed answers are far shorter. */
export const MAX_FRAME_BYTES = 2048;
/** Longest typed answer, the same cap as a translate claim (feature 016). */
export const MAX_ANSWER_LENGTH = 500;
/** People who may watch a room besides its two players (feature 026): five in all. */
export const MAX_SPECTATORS = 3;
/** Options in "Nghe và chọn từ" (`LISTENING_OPTIONS`). */
export const CHOICE_COUNT = 4;

/** Socket close codes the client reacts to. */
export const CLOSE_CODES = {
  /** The room closed (creator left, idle, match over and everyone gone). */
  roomClosed: 4000,
  /** The same player opened the room in another tab; the newer socket wins. */
  replaced: 4001,
  /** A frame over MAX_FRAME_BYTES. */
  tooBig: 1009,
} as const;

const questionIndex = z.number().int().min(0).max(99);

export const clientFrameSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("typing"), q: questionIndex }),
  z.object({ type: z.literal("answer"), q: questionIndex, text: z.string().trim().min(1).max(MAX_ANSWER_LENGTH) }),
  z.object({ type: z.literal("choose"), q: questionIndex, choice: z.number().int().min(0).max(CHOICE_COUNT - 1) }),
  z.object({ type: z.literal("rematch") }),
  /** The host picks who plays them next, after a match (feature 027). */
  z.object({ type: z.literal("pick"), userId: z.string().min(1).max(100) }),
  /** The creator changes the room's settings before a match (AC-031). */
  z.object({ type: z.literal("settings"), settings: settingsSchema }),
  z.object({ type: z.literal("leave") }),
  /** The creator lists the lobby in "Cộng đồng" (feature 041). */
  z.object({ type: z.literal("publish") }),
]);
export type ClientFrame = z.infer<typeof clientFrameSchema>;

/** A player's frame, or null when it is too long, not JSON, or not a known frame. */
export function parseClientFrame(raw: string): ClientFrame | null {
  if (new TextEncoder().encode(raw).length > MAX_FRAME_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = clientFrameSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export const PHASES = ["lobby", "ready", "countdown", "question", "reveal", "round-end", "paused", "match-end", "closed"] as const;
export type Phase = (typeof PHASES)[number];

export const publicPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  connected: z.boolean(),
  ready: z.boolean(),
  /** Points in the current round. */
  score: z.number().int(),
  roundsWon: z.number().int(),
});
export type PublicPlayer = z.infer<typeof publicPlayerSchema>;

/** What a question shows before its reveal: never the answer, and no clip for recall (it says the word). */
export const publicQuestionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("listen"), audio: z.string(), options: z.array(z.string()).length(CHOICE_COUNT) }),
  /** `mask`: the headword with each letter as "_", keeping spaces, hyphens and apostrophes ("___-_____"). */
  z.object({ type: z.literal("recall"), meaningsVi: z.array(z.string()).min(1), pos: z.string(), mask: z.string() }),
  z.object({ type: z.literal("write"), vi: z.string() }),
]);
export type PublicQuestion = z.infer<typeof publicQuestionSchema>;

export const revealSchema = z.object({
  /** The headword, or the English sentence. */
  answer: z.string(),
  ipa: z.string().optional(),
  audio: z.string().optional(),
  /** Option index of the answer, for "Nghe và chọn từ". */
  answerIndex: z.number().int().optional(),
  /** Who scored; null when time ran out. */
  answeredBy: z.string().nullable(),
});
export type Reveal = z.infer<typeof revealSchema>;

export const roundResultSchema = z.object({
  round: z.number().int(),
  scores: z.record(z.string(), z.number().int()),
  winnerId: z.string(),
  /** The round went to sudden death (feature 025). Absent on rounds without it, and on rooms saved before. */
  suddenDeath: z.boolean().optional(),
});
export type RoundResult = z.infer<typeof roundResultSchema>;

export const END_REASONS = ["won", "forfeit", "cancelled"] as const;

export const publicRoomSchema = z.object({
  code: z.string(),
  settings: settingsSchema,
  creatorId: z.string(),
  phase: z.enum(PHASES),
  players: z.array(publicPlayerSchema),
  /** 1-based; 0 before the first round. */
  round: z.number().int(),
  /** 0-based question in the round, sudden-death questions after the 12. */
  questionIndex: z.number().int(),
  questionCount: z.number().int(),
  /** Sudden-death questions asked this round (0 to 3). */
  suddenDeath: z.number().int(),
  /** Epoch ms (room clock) when the current phase ends; null when nothing is counting down. */
  deadline: z.number().nullable(),
  question: publicQuestionSchema.nullable(),
  questionType: z.enum(QUESTION_TYPES).nullable(),
  /** Players who picked a wrong option this question and are locked out of it. */
  lockedOut: z.array(z.string()),
  reveal: revealSchema.nullable(),
  rounds: z.array(roundResultSchema),
  /** The player the match is waiting for while paused. */
  pausedFor: z.string().nullable(),
  winnerId: z.string().nullable(),
  endReason: z.enum(END_REASONS).nullable(),
  /** Players who asked for a rematch. */
  rematch: z.array(z.string()),
  /** People watching without playing (feature 026); they can't answer or change anything. */
  spectators: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Listed in "Cộng đồng" (feature 041); absent from rooms before it. */
  public: z.boolean().default(false),
});
export type PublicRoom = z.infer<typeof publicRoomSchema>;

export const roomFrameSchema = z.discriminatedUnion("type", [
  /** The whole room, on join, reconnect and every change of phase or score. `serverNow` sets the client's clock offset. */
  z.object({ type: z.literal("state"), room: publicRoomSchema, serverNow: z.number() }),
  z.object({ type: z.literal("typing"), userId: z.string() }),
  z.object({ type: z.literal("wrong"), userId: z.string() }),
  /** A Vietnamese message for the player, e.g. a refused action. */
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type RoomFrame = z.infer<typeof roomFrameSchema>;

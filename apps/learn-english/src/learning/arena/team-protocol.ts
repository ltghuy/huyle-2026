// The socket protocol of team rooms ("Đấu đội", feature 039): the host's
// settings, the frames players send, and the room view the room sends back.
// Pure and shared by the room (Durable Object) and the browser. Typing, wrong
// and error frames are the duel ones (`roomFrameSchema` in ./protocol).
import { z } from "zod";
import { LEVELS } from "../types";
import { ARENA_MODES, CHOICE_COUNT, DEFAULT_QUESTION_TIME, MAX_ANSWER_LENGTH, MAX_FRAME_BYTES, publicQuestionSchema, QUESTION_TYPES, revealSchema } from "./protocol";

/** Players a team room holds, the host included (AC-002). */
export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 10;
/** Round lengths the host can pick, in minutes (AC-002). */
export const ROUND_MINUTES = [5, 10, 15] as const;
export type RoundMinutes = (typeof ROUND_MINUTES)[number];
export const DEFAULT_ROUND_MINUTES: RoundMinutes = 5;

export const TEAMS = ["A", "B"] as const;
export type Team = (typeof TEAMS)[number];

export const teamSettingsSchema = z.object({
  mode: z.enum(ARENA_MODES),
  level: z.enum(LEVELS),
  rounds: z.union([z.literal(1), z.literal(3)]),
  seconds: z.union([z.literal(15), z.literal(25), z.literal(30), z.literal(45)]).default(DEFAULT_QUESTION_TIME),
  size: z.number().int().min(MIN_TEAM_SIZE).max(MAX_TEAM_SIZE),
  minutes: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});
export type TeamSettings = z.infer<typeof teamSettingsSchema>;

/** A round's length in ms. */
export function roundMs(settings: Pick<TeamSettings, "minutes">): number {
  return settings.minutes * 60_000;
}

const team = z.enum(TEAMS);
const userId = z.string().min(1).max(100);
/** The question's number in the round; a round can ask a few hundred. */
const questionNumber = z.number().int().min(0).max(999);

export const teamClientFrameSchema = z.discriminatedUnion("type", [
  /** The host puts a player on a team, or takes them off one (`team: null`) (AC-009). */
  z.object({ type: z.literal("assign"), userId, team: team.nullable() }),
  /** The host's turn order for a team (AC-010): every member, once. */
  z.object({ type: z.literal("order"), team, ids: z.array(userId).max(MAX_TEAM_SIZE) }),
  /** "Chia ngẫu nhiên" (AC-011). */
  z.object({ type: z.literal("shuffle") }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("typing"), q: questionNumber }),
  z.object({ type: z.literal("answer"), q: questionNumber, text: z.string().trim().min(1).max(MAX_ANSWER_LENGTH) }),
  z.object({ type: z.literal("choose"), q: questionNumber, choice: z.number().int().min(0).max(CHOICE_COUNT - 1) }),
  /** "Gợi ý" (AC-032). */
  z.object({ type: z.literal("hint"), q: questionNumber }),
  z.object({ type: z.literal("settings"), settings: teamSettingsSchema }),
  /** "Chơi lại" (AC-051). */
  z.object({ type: z.literal("again") }),
  z.object({ type: z.literal("leave") }),
  /** The host lists the lobby in "Cộng đồng" (feature 041). */
  z.object({ type: z.literal("publish") }),
]);
export type TeamClientFrame = z.infer<typeof teamClientFrameSchema>;

/** A player's frame, or null when it is too long, not JSON, or not a known frame. */
export function parseTeamFrame(raw: string): TeamClientFrame | null {
  if (new TextEncoder().encode(raw).length > MAX_FRAME_BYTES) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = teamClientFrameSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export const TEAM_PHASES = ["lobby", "countdown", "question", "reveal", "round-end", "paused", "match-end", "closed"] as const;
export type TeamPhase = (typeof TEAM_PHASES)[number];

/** Where a round is: the timed questions, or sudden death after a tie (AC-037). */
export const STAGES = ["main", "sudden"] as const;
export type Stage = (typeof STAGES)[number];

const scores = z.object({ A: z.number().int(), B: z.number().int() });

export const teamViewSchema = z.object({
  /** Turn order (AC-010). */
  members: z.array(z.string()),
  /** Points this round. */
  score: z.number().int(),
  hints: z.number().int(),
  roundsWon: z.number().int(),
});
export type TeamView = z.infer<typeof teamViewSchema>;

export const teamRoundResultSchema = z.object({
  round: z.number().int(),
  scores,
  /** Null when the round was a draw (AC-037). */
  winner: team.nullable(),
  suddenDeath: z.boolean(),
});
export type TeamRoundResult = z.infer<typeof teamRoundResultSchema>;

export const publicTeamRoomSchema = z.object({
  kind: z.literal("team"),
  code: z.string(),
  settings: teamSettingsSchema,
  hostId: z.string(),
  phase: z.enum(TEAM_PHASES),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      image: z.string().nullable(),
      connected: z.boolean(),
      /** Questions they answered and got right this match (AC-041). */
      answered: z.number().int(),
      correct: z.number().int(),
    }),
  ),
  teams: z.object({ A: teamViewSchema, B: teamViewSchema }),
  /** 1-based; 0 before the first round. */
  round: z.number().int(),
  /** Epoch ms (room clock) when the round's time is up; null outside a round and while paused. */
  roundEndsAt: z.number().nullable(),
  /** The round's time left while the match is paused. */
  roundLeftMs: z.number().nullable(),
  stage: z.enum(STAGES),
  /** Sudden-death pair being played (1 to 3), 0 before sudden death. */
  suddenPair: z.number().int(),
  /** Questions opened this round; the open one is number `number` (1-based). */
  number: z.number().int(),
  turn: z.object({ team, userId: z.string() }).nullable(),
  /** Epoch ms (room clock) when the current phase ends; null when nothing counts down. */
  deadline: z.number().nullable(),
  question: publicQuestionSchema.nullable(),
  questionType: z.enum(QUESTION_TYPES).nullable(),
  /** The open question's hint, once used (AC-033, AC-034). */
  hint: z.string().nullable(),
  /** The turn player picked a wrong option and can't answer again. */
  lockedOut: z.boolean(),
  reveal: revealSchema.extend({ correct: z.boolean(), by: z.string() }).nullable(),
  rounds: z.array(teamRoundResultSchema),
  /** The team the paused match waits for (AC-045). */
  pausedTeam: team.nullable(),
  winner: z.union([team, z.literal("draw")]).nullable(),
  endReason: z.enum(["won", "forfeit", "cancelled"]).nullable(),
  /** Listed in "Cộng đồng" (feature 041); absent from rooms before it. */
  public: z.boolean().default(false),
});
export type PublicTeamRoom = z.infer<typeof publicTeamRoomSchema>;

export const teamStateFrameSchema = z.object({ type: z.literal("team-state"), room: publicTeamRoomSchema, serverNow: z.number() });
export type TeamStateFrame = z.infer<typeof teamStateFrameSchema>;

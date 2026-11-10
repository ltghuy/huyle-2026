// Request and response shapes of the Arena routes (feature 023). No
// `server-only`: the browser's Arena client shares these types and messages.
import { z } from "zod";
import { CODE_PATTERN, settingsSchema, type ArenaSettings, type MatchSettings } from "@/learning/arena/protocol";
import { teamSettingsSchema, type TeamSettings } from "@/learning/arena/team-protocol";

export const ARENA_MESSAGES = {
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Thông tin phòng không hợp lệ.",
  notFound: "Không tìm thấy phòng. Bạn kiểm tra lại mã nhé.",
  full: "Phòng đã đủ người.",
  // Team rooms (feature 039) take no one once the match is on.
  started: "Trận đấu đã bắt đầu, bạn không vào được nữa.",
  throttled: "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.",
  unavailable: "Đấu trường đang tạm nghỉ, bạn thử lại sau nhé.",
  // Challenges (feature 035).
  notFriend: "Bạn chỉ thách đấu được bạn bè.",
  notHost: "Chỉ chủ phòng đang chờ đối thủ mới thách đấu được.",
  seatTaken: "Phòng đã có đối thủ.",
} as const;

/** The learner's chosen name, if any; checked like a board name, else their Google name is used. */
const chosenName = z.string().max(60).optional();

export const createBodySchema = settingsSchema.extend({ name: chosenName });
export type CreateBody = z.infer<typeof createBodySchema>;

/** "Đấu đội" (feature 039): the host's team room settings. */
export const createTeamBodySchema = teamSettingsSchema.extend({ name: chosenName });

export const joinBodySchema = z.object({
  // Typed codes are forgiven case and spaces ("k7p 2qx").
  code: z
    .string()
    .transform((code) => code.replace(/\s+/g, "").toUpperCase())
    .pipe(z.string().regex(CODE_PATTERN)),
  name: chosenName,
});
export type JoinBody = z.infer<typeof joinBodySchema>;

const roomCode = z.string().regex(CODE_PATTERN);
const friendId = z.string().min(1).max(100);

/** "Thách đấu" (feature 035): the host's name as the room shows it, like a create. */
export const challengeBodySchema = z.object({ code: roomCode, friendId, name: chosenName });
export const cancelChallengeBodySchema = z.object({ code: roomCode, friendId });

/** A link socket ticket (feature 035), valid for 60 s like a room ticket. */
export interface LinkTicket {
  ticket: string;
}

interface TicketBase {
  code: string;
  /** Opens the room's socket within 60 s: `new WebSocket(url, ["arena", ticket])`. */
  ticket: string;
}

/** A ticket into a duel room, or a team room (feature 039); `kind` says which screen to show. */
export type RoomTicket = (TicketBase & { kind?: "duel"; settings: ArenaSettings }) | (TicketBase & { kind: "team"; settings: TeamSettings });

export interface ArenaStatsResponse {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
}

/** One past match from the signed-in learner's side (feature 025). */
export interface ArenaMatch {
  id: string;
  /** Epoch ms. */
  endedAt: number;
  won: boolean;
  forfeit: boolean;
  /** Rounds won. */
  score: { mine: number; theirs: number };
  /** Null when the opponent has deleted their account. `id` lets the learner send a friend request (feature 031). */
  opponent: { id: string; name: string; image: string | null } | null;
  settings: MatchSettings;
  rounds: { round: number; mine: number; theirs: number; won: boolean; suddenDeath: boolean; onTime: boolean }[];
  /** Team matches only (feature 039): the learner's team, a draw, and both teams' players in turn order. `score` and `rounds` are then their team's side. */
  team?: { mine: "A" | "B"; draw: boolean; members: { A: ArenaMatchMember[]; B: ArenaMatchMember[] } };
}

export interface ArenaMatchMember {
  id: string;
  name: string;
  image: string | null;
}

/** The learner's record and their newest matches, newest first. */
export interface ArenaMatchesResponse {
  stats: ArenaStatsResponse;
  matches: ArenaMatch[];
}

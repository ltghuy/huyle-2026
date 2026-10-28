import { localDate } from "@/learning/attendance";
import { weekKey, weekPoints } from "@/learning/leaderboard";
import type { LeaderboardState, Profile } from "@/learning/types";
import type { ApiError } from "@/lib/http";
import { LEADERBOARD_MESSAGES, type SubmitBody, type SubmitResponse } from "@/server/leaderboard/leaderboard.schema";
import { getAllAttendance } from "@/storage/attendance";
import { updateProfile } from "@/storage/meta";

// Browser side of the weekly leaderboard (feature 007). The entry's id and
// secret are made here and kept on the profile; the server only ever sees the
// shown name and this week's points.

export const LEADERBOARD_URL = "/api/leaderboard";

type Joined = Extract<LeaderboardState, { status: "joined" }>;

/** A failed board request, with the Vietnamese message to show. */
export class BoardError extends Error {}

export interface BoardResult extends SubmitResponse {
  /** The learner's points before this lesson, for the slide (`slideOffsets`). */
  previousPoints: number;
}

/** 32 random bytes as base64url without padding (the server's TOKEN_PATTERN). */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

async function send(method: "POST" | "DELETE", body: unknown): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(LEADERBOARD_URL, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new BoardError("Không kết nối được bảng xếp hạng. Bạn kiểm tra mạng nhé.");
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => undefined)) as ApiError | undefined;
    throw new BoardError(error?.error.message ?? LEADERBOARD_MESSAGES.unavailable);
  }
  return response;
}

/** Saves the learner's yes, under `name` (already checked with `checkBoardName`). Nothing is sent yet. */
export async function joinBoard(name: string, now: number): Promise<Joined> {
  const leaderboard: Joined = { status: "joined", id: crypto.randomUUID(), token: newToken(), name };
  await updateProfile({ leaderboard }, now);
  return leaderboard;
}

/** Saves the learner's no: they won't be asked again (AC-008). */
export async function declineBoard(now: number): Promise<void> {
  await updateProfile({ leaderboard: { status: "declined" } }, now);
}

/** This week's points for the board, from attendance in the learner's time zone. */
async function thisWeek(profile: Pick<Profile, "timeZone">, now: number) {
  const today = localDate(now, profile.timeZone);
  return { week: weekKey(today), ...weekPoints(await getAllAttendance(), today) };
}

/** Sends this week's points and returns the learner's place before and after this lesson. */
export async function submitWeek(entry: Joined, profile: Pick<Profile, "timeZone">, now: number): Promise<BoardResult> {
  const week = await thisWeek(profile, now);
  const body: SubmitBody = { id: entry.id, token: entry.token, name: entry.name, ...week };
  const result = (await (await send("POST", body)).json()) as SubmitResponse;
  return { ...result, previousPoints: week.previousPoints };
}

/**
 * Changes the shown name. With points this week the entry is updated now;
 * otherwise the new name goes up with the next lesson, so a rename alone
 * never puts a learner with 0 points on the board.
 */
export async function renameOnBoard(entry: Joined, name: string, profile: Pick<Profile, "timeZone">, now: number): Promise<void> {
  const week = await thisWeek(profile, now);
  if (week.points > 0) {
    const body: SubmitBody = { id: entry.id, token: entry.token, name, ...week, previousPoints: week.points };
    await send("POST", body);
  }
  await updateProfile({ leaderboard: { ...entry, name } }, now);
}

/** Deletes the entry from the server, then saves "declined" (AC-010). */
export async function leaveBoard(entry: Joined, now: number): Promise<void> {
  await send("DELETE", { id: entry.id, token: entry.token });
  await updateProfile({ leaderboard: { status: "declined" } }, now);
}

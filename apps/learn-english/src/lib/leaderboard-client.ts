import { localDate } from "@/learning/attendance";
import { boardNumbers, type BoardNumbers } from "@/learning/leaderboard";
import type { LeaderboardState, Profile } from "@/learning/types";
import type { ApiError } from "@/lib/http";
import { LEADERBOARD_MESSAGES, type SubmitBody, type SubmitResponse } from "@/server/leaderboard/leaderboard.schema";
import { getAllAttendance } from "@/storage/attendance";
import { updateProfile } from "@/storage/meta";

// Browser side of the leaderboard (feature 007, ranked by streak since 013).
// The entry's id and secret are made here and kept on the profile; the server
// only ever sees the shown name, the current streak and points ever earned.

export const LEADERBOARD_URL = "/api/leaderboard";

type Joined = Extract<LeaderboardState, { status: "joined" }>;

/** A failed board request, with the Vietnamese message to show. */
export class BoardError extends Error {}

export interface BoardResult extends SubmitResponse {
  /** The learner's numbers before this lesson, for the slide (`slideOffsets`). */
  previous: { streak: number; earned: number };
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

/** The learner's board numbers today, from attendance in their time zone. */
async function numbersToday(profile: Pick<Profile, "timeZone">, now: number): Promise<BoardNumbers & { today: string }> {
  const today = localDate(now, profile.timeZone);
  return { today, ...boardNumbers(await getAllAttendance(), today) };
}

/** Sends the streak after a daily lesson and returns the learner's place before and after it (013 AC-010). */
export async function submitStreak(entry: Joined, profile: Pick<Profile, "timeZone">, now: number): Promise<BoardResult> {
  const numbers = await numbersToday(profile, now);
  const body: SubmitBody = { id: entry.id, token: entry.token, name: entry.name, ...numbers };
  const result = (await (await send("POST", body)).json()) as SubmitResponse;
  return { ...result, previous: { streak: numbers.previousStreak, earned: numbers.previousEarned } };
}

/**
 * Changes the shown name. While the streak is alive the entry is updated now;
 * otherwise the new name goes up with the next lesson, so a rename alone
 * never puts a learner with a broken streak back on the board.
 */
export async function renameOnBoard(entry: Joined, name: string, profile: Pick<Profile, "timeZone">, now: number): Promise<void> {
  const numbers = await numbersToday(profile, now);
  if (numbers.streak > 0) {
    const body: SubmitBody = { id: entry.id, token: entry.token, name, ...numbers, previousStreak: numbers.streak, previousEarned: numbers.earned };
    await send("POST", body);
  }
  await updateProfile({ leaderboard: { ...entry, name } }, now);
}

/** Deletes the entry from the server, then saves "declined" (AC-010). */
export async function leaveBoard(entry: Joined, now: number): Promise<void> {
  await send("DELETE", { id: entry.id, token: entry.token });
  await updateProfile({ leaderboard: { status: "declined" } }, now);
}

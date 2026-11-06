import "server-only";
import { checkBoardName } from "@/learning/leaderboard";
import { MAX_SPECTATORS, type ArenaSettings } from "@/learning/arena/protocol";
import type { SessionUser } from "@/server/auth/session";
import type { RoomTicket } from "./arena.schema";
import { signTicket } from "./ticket";

// Creating and joining Arena rooms (feature 023), for the routes. A room is the
// Durable Object named by its code; these calls only reach it over RPC and
// hand out the ticket the browser opens its socket with.

/** Room code letters: no 0/O or 1/I/L, which players mix up when reading a code aloud. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
/** Codes tried before giving up; with 31^6 codes a clash is already rare. */
const CREATE_ATTEMPTS = 5;

type Rooms = CloudflareEnv["ARENA_ROOM"];

export type JoinResult = { ok: true; value: RoomTicket } | { ok: false; reason: "not-found" | "full" };

export function randomCode(random: () => number = Math.random): string {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}

/** The name players see: the learner's chosen name when it passes the board rules, else their Google name. */
export function playerName(chosen: string | undefined, user: SessionUser): string {
  for (const candidate of [chosen ?? "", user.name]) {
    const checked = checkBoardName(candidate);
    if (checked.ok) return checked.name;
  }
  return "Học viên";
}

async function ticketFor(user: SessionUser, name: string, code: string, settings: ArenaSettings, secret: string, now: number): Promise<RoomTicket> {
  return { code, settings, ticket: await signTicket({ uid: user.id, name, image: user.image, code }, secret, now) };
}

/** A new room with the creator seated (AC-002, AC-003); null when no free code was found. */
export async function createRoom(
  rooms: Rooms,
  input: { settings: ArenaSettings; user: SessionUser; name: string; secret: string; now: number; random?: () => number },
): Promise<RoomTicket | null> {
  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
    const code = randomCode(input.random);
    const created = await rooms.getByName(code).create({ code, settings: input.settings, creator: { id: input.user.id, name: input.name, image: input.user.image } });
    if (created) return ticketFor(input.user, input.name, code, input.settings, input.secret, input.now);
  }
  return null;
}

/**
 * A ticket into an open room, or why not (feature 023 AC-004, AC-005; feature 026). A player already seated
 * (back from a drop) or already watching may always come back. Once both seats are taken, up to three more
 * people get in to watch; the room itself decides who plays and who watches, and refuses a late sixth.
 */
export async function joinRoom(rooms: Rooms, input: { code: string; user: SessionUser; name: string; secret: string; now: number }): Promise<JoinResult> {
  const status = await rooms.getByName(input.code).status();
  if (!status) return { ok: false, reason: "not-found" };
  const known = status.playerIds.includes(input.user.id) || status.spectatorIds.includes(input.user.id);
  const freeSeat = status.phase === "lobby" && status.playerIds.length < 2;
  if (!known && !freeSeat && status.spectatorIds.length >= MAX_SPECTATORS) return { ok: false, reason: "full" };
  return { ok: true, value: await ticketFor(input.user, input.name, input.code, status.settings, input.secret, input.now) };
}

import type { ArenaSettings } from "@/learning/arena/protocol";
import type { ApiError } from "@/lib/http";
import { ARENA_MESSAGES, type ArenaMatchesResponse, type ArenaStatsResponse, type RoomTicket } from "@/server/arena/arena.schema";

// Browser side of the Arena routes (feature 023): create a room, join one by
// code, and read the learner's record and match history. Each answers in Vietnamese on failure.

/** A failed Arena request, with the Vietnamese message to show. */
export class ArenaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const OFFLINE = "Không kết nối được Đấu trường. Bạn kiểm tra mạng nhé.";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...init });
  } catch {
    throw new ArenaError(OFFLINE, 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiError | undefined;
    throw new ArenaError(body?.error.message ?? ARENA_MESSAGES.unavailable, response.status);
  }
  return (await response.json()) as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

/** A new room with these settings; `name` is the learner's chosen name, if any. */
export function createRoom(settings: ArenaSettings, name?: string): Promise<RoomTicket> {
  return post<RoomTicket>("/api/arena/rooms", { ...settings, ...(name ? { name } : {}) });
}

/** A ticket into the room with this code (also a fresh one for a player already seated). */
export function joinRoom(code: string, name?: string): Promise<RoomTicket> {
  return post<RoomTicket>("/api/arena/join", { code, ...(name ? { name } : {}) });
}

export function fetchArenaStats(): Promise<ArenaStatsResponse> {
  return request<ArenaStatsResponse>("/api/arena/stats");
}

/** The learner's record and newest matches (feature 025). */
export function fetchArenaMatches(): Promise<ArenaMatchesResponse> {
  return request<ArenaMatchesResponse>("/api/arena/matches");
}

/** The room's socket URL on this site. */
export function socketUrl(code: string, location: Pick<Location, "protocol" | "host"> = window.location): string {
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/arena/socket?code=${encodeURIComponent(code)}`;
}

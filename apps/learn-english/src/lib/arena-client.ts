import type { ArenaSettings } from "@/learning/arena/protocol";
import type { TeamSettings } from "@/learning/arena/team-protocol";
import type { ApiError } from "@/lib/http";
import type { DeliveryState } from "@/learning/arena/link";
import {
  ARENA_MESSAGES,
  type ArenaMatchesResponse,
  type ArenaStatsResponse,
  type CommunityQuery,
  type CommunityResponse,
  type LinkTicket,
  type RoomTicket,
} from "@/server/arena/arena.schema";

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

/** A new team room ("Đấu đội", feature 039) with these settings. */
export function createTeamRoom(settings: TeamSettings, name?: string): Promise<RoomTicket> {
  return post<RoomTicket>("/api/arena/teams", { ...settings, ...(name ? { name } : {}) });
}

/**
 * A ticket into the room with this code (also a fresh one for a player already seated). From
 * "Cộng đồng", `seatOnly` refuses a full duel instead of seating the learner as a spectator (feature 041).
 */
export function joinRoom(code: string, name?: string, options: { seatOnly?: boolean } = {}): Promise<RoomTicket> {
  return post<RoomTicket>("/api/arena/join", { code, ...(name ? { name } : {}), ...(options.seatOnly ? { seatOnly: true } : {}) });
}

/** The public lobbies with a free seat, newest first (feature 041). */
export function fetchCommunity(query: CommunityQuery): Promise<CommunityResponse> {
  const params = new URLSearchParams();
  if (query.kind) params.set("kind", query.kind);
  if (query.level) params.set("level", query.level);
  const search = params.toString();
  return request<CommunityResponse>(`/api/arena/community${search ? `?${search}` : ""}`);
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

/** The tab's link socket URL on this site (feature 035). */
export function linkSocketUrl(location: Pick<Location, "protocol" | "host"> = window.location): string {
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/api/arena/link/socket`;
}

/** A 60-second ticket for the link socket. */
export function fetchLinkTicket(): Promise<LinkTicket> {
  return post<LinkTicket>("/api/arena/link", {});
}

/** "Thách đấu": whether the friend sees it, or an ArenaError with the reason (feature 035). */
export function sendChallenge(code: string, friendId: string, name?: string): Promise<{ state: DeliveryState }> {
  return post<{ state: DeliveryState }>("/api/arena/challenges", { code, friendId, ...(name ? { name } : {}) });
}

/**
 * Withdraws a challenge. Fire and forget: `keepalive` lets it finish while the host leaves the
 * page, and a lost cancel only means the friend's toast runs out its 30 seconds.
 */
export function cancelChallenge(code: string, friendId: string): void {
  fetch("/api/arena/challenges/cancel", {
    method: "POST",
    credentials: "same-origin",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, friendId }),
  }).catch(() => {});
}

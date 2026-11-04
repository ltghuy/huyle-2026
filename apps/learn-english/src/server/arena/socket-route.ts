// The Arena's socket route (feature 023), called by `worker.ts` before Next.js:
// checks the room code and the player's ticket, then hands the socket to the
// room with the ticket's identity. The ticket travels in the WebSocket
// subprotocol header (`new WebSocket(url, ["arena", ticket])`), not the URL,
// because it carries the player's name and avatar and URLs end up in logs.
//
// No `import "server-only"`: `worker.ts` bundles this module (knowledge.md, 023).
import { CODE_PATTERN } from "@/learning/arena/protocol";
import { verifyTicket } from "./ticket";

export const SOCKET_PATH = "/api/arena/socket";
/** Header this route sets for the room after checking the ticket: the player's identity as JSON. */
export const PLAYER_HEADER = "X-Arena-Player";
/** The subprotocol the browser offers first and the room accepts. */
export const ARENA_PROTOCOL = "arena";

export const SOCKET_MESSAGES = {
  unavailable: "Đấu trường đang tạm nghỉ, bạn thử lại sau nhé.",
  signIn: "Phiên vào phòng đã hết hạn. Bạn vào lại phòng nhé.",
} as const;

type ArenaEnv = Pick<CloudflareEnv, "ARENA_ROOM"> & { ARENA_SECRET?: string };

function text(message: string, status: number): Response {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/** The ticket offered after "arena" in `Sec-WebSocket-Protocol`, or null. */
function ticketFrom(request: Request): string | null {
  const offered = (request.headers.get("Sec-WebSocket-Protocol") ?? "").split(",").map((part) => part.trim());
  return offered[0] === ARENA_PROTOCOL && offered[1] ? offered[1] : null;
}

/** Handles `/api/arena/socket`; null for every other path, which `worker.ts` sends to Next.js. */
export async function handleArenaSocket(request: Request, env: ArenaEnv, now = Date.now()): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== SOCKET_PATH) return null;
  if (request.headers.get("Upgrade") !== "websocket") return text("Expected a WebSocket", 426);

  const code = url.searchParams.get("code") ?? "";
  if (!CODE_PATTERN.test(code)) return text("Bad room code", 400);
  const ticket = ticketFrom(request);
  if (!ticket) return text(SOCKET_MESSAGES.signIn, 401);
  if (!env.ARENA_SECRET || env.ARENA_SECRET.length < 32) {
    console.error("ARENA_SECRET is not set");
    return text(SOCKET_MESSAGES.unavailable, 503);
  }
  const claims = await verifyTicket(ticket, env.ARENA_SECRET, code, now);
  if (!claims) return text(SOCKET_MESSAGES.signIn, 401);

  // The identity comes only from the checked ticket; whatever the browser sent is overwritten.
  const headers = new Headers(request.headers);
  headers.set(PLAYER_HEADER, JSON.stringify({ id: claims.uid, name: claims.name, image: claims.image }));
  headers.delete("Sec-WebSocket-Protocol");
  try {
    return await env.ARENA_ROOM.getByName(code).fetch(new Request(request, { headers }));
  } catch (error) {
    // Over a free-plan limit, or the room failed: tell the player instead of a bare error.
    console.error("Arena room unavailable:", error);
    return text(SOCKET_MESSAGES.unavailable, 503);
  }
}

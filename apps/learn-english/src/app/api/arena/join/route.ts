import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireUser } from "@/server/auth/session";
import { getArenaEnv } from "@/server/env";
import { ARENA_MESSAGES as MESSAGES, joinBodySchema } from "@/server/arena/arena.schema";
import { joinRoom, playerName } from "@/server/arena/arena.service";
import { error, isThrottled, json, readBody } from "@/server/arena/request";

const REFUSED: Record<"not-found" | "full" | "started", { message: string; status: number }> = {
  "not-found": { message: MESSAGES.notFound, status: 404 },
  full: { message: MESSAGES.full, status: 409 },
  started: { message: MESSAGES.started, status: 409 },
};

// Joins an Arena room by code (feature 023, AC-004, AC-005): a ticket to open its socket, or why not.
// A player already seated (back from a drop) always gets a new ticket. Every response is `no-store`.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, joinBodySchema);
  if ("response" in body) return body.response;
  if (await isThrottled(request)) return error(MESSAGES.throttled, 429);

  try {
    const result = await joinRoom(getCloudflareContext().env.ARENA_ROOM, {
      code: body.data.code,
      user: session.user,
      name: playerName(body.data.name, session.user),
      secret: getArenaEnv().ARENA_SECRET,
      now: Date.now(),
    });
    if (!result.ok) return error(REFUSED[result.reason].message, REFUSED[result.reason].status);
    return json(result.value, 200);
  } catch (cause) {
    console.error("Arena join failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

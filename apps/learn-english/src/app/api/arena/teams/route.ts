import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireUser } from "@/server/auth/session";
import { getArenaEnv } from "@/server/env";
import { ARENA_MESSAGES as MESSAGES, createTeamBodySchema } from "@/server/arena/arena.schema";
import { createTeamRoom, playerName } from "@/server/arena/arena.service";
import { error, isThrottled, json, readBody } from "@/server/arena/request";

// Creates a team room ("Đấu đội", feature 039, AC-002, AC-003): the signed-in host gets the room code
// and a ticket to open its socket. Every response is `no-store`.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, createTeamBodySchema);
  if ("response" in body) return body.response;
  if (await isThrottled(request)) return error(MESSAGES.throttled, 429);

  const { name, ...settings } = body.data;
  try {
    const room = await createTeamRoom(getCloudflareContext().env.ARENA_ROOM, {
      settings,
      user: session.user,
      name: playerName(name, session.user),
      secret: getArenaEnv().ARENA_SECRET,
      now: Date.now(),
    });
    if (!room) return error(MESSAGES.unavailable, 503);
    return json(room, 201);
  } catch (cause) {
    console.error("Arena team create failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

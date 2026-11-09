import { requireUser } from "@/server/auth/session";
import { getArenaEnv } from "@/server/env";
import { ARENA_MESSAGES as MESSAGES } from "@/server/arena/arena.schema";
import { linkTicket } from "@/server/arena/challenge.service";
import { error, json } from "@/server/arena/request";

// A ticket for the tab's link socket (feature 035), fetched again on every reconnect. `no-store`.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    return json(await linkTicket(session.user, getArenaEnv().ARENA_SECRET, Date.now()), 200);
  } catch (cause) {
    console.error("Link ticket failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

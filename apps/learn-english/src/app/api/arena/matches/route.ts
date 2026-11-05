import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ARENA_MESSAGES as MESSAGES } from "@/server/arena/arena.schema";
import { listHistory } from "@/server/arena/history";
import { error, json } from "@/server/arena/request";

// The signed-in learner's Arena record and newest matches (feature 025): only their own,
// so the route takes no user id. One D1 round trip; `no-store`.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    return json(await listHistory(getDb(), session.user.id), 200);
  } catch (cause) {
    console.error("Arena history failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

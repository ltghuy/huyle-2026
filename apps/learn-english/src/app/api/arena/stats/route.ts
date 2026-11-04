import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ARENA_MESSAGES as MESSAGES, type ArenaStatsResponse } from "@/server/arena/arena.schema";
import { error, json } from "@/server/arena/request";
import { getStats } from "@/server/arena/stats";

// The signed-in learner's Arena record for Hồ sơ (feature 023, AC-030). `no-store`.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    const stats: ArenaStatsResponse = await getStats(getDb(), session.user.id);
    return json(stats, 200);
  } catch (cause) {
    console.error("Arena stats failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

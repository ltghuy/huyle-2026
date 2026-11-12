import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ARENA_MESSAGES as MESSAGES, communityQuerySchema, type CommunityResponse } from "@/server/arena/arena.schema";
import { listCommunity } from "@/server/arena/community";
import { error, json } from "@/server/arena/request";

// "Cộng đồng" (feature 041, AC-007, AC-008): the public Arena lobbies with a free seat, for any
// signed-in learner. Read only (one D1 query); joining goes through `/api/arena/join`. `no-store`.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const params = new URL(request.url).searchParams;
  const query = communityQuerySchema.safeParse({ kind: params.get("kind") ?? undefined, level: params.get("level") ?? undefined });
  if (!query.success) return error(MESSAGES.invalidBody, 422, z.treeifyError(query.error));
  try {
    const body: CommunityResponse = { rooms: await listCommunity(getDb(), query.data, Date.now()) };
    return json(body, 200);
  } catch (cause) {
    console.error("Arena community failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

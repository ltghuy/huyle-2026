import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ARENA_MESSAGES as MESSAGES, onlineQuerySchema, type OnlineResponse } from "@/server/arena/arena.schema";
import { listOnline, mayListOnline } from "@/server/arena/online.service";
import { error, json } from "@/server/arena/request";

// "Đang trực tuyến" (feature 045, AC-002, AC-005, AC-007): the learners online now, only for the
// host of a waiting room opened from Cộng đồng, so nobody else can list who is online.
// Read only: one room status call and one D1 query. `no-store`.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const query = onlineQuerySchema.safeParse({ code: new URL(request.url).searchParams.get("code") ?? undefined });
  if (!query.success) return error(MESSAGES.invalidBody, 422, z.treeifyError(query.error));

  try {
    const status = await getCloudflareContext().env.ARENA_ROOM.getByName(query.data.code).status();
    if (!mayListOnline(status, session.user.id)) return error(MESSAGES.notHost, 403);
    const body: OnlineResponse = { learners: await listOnline(getDb(), session.user.id, Date.now()) };
    return json(body, 200);
  } catch (cause) {
    console.error("Arena online list failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

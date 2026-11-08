import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { respond } from "@/server/social/friends.service";
import { error, json, readBody } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES, respondBodySchema } from "@/server/social/social.schema";

// "Đồng ý" / "Từ chối" on a request sent to the signed-in learner (feature 031, AC-005, AC-006).
// 404 with "Lời mời này không còn nữa." when it no longer waits (AC-029).
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, respondBodySchema);
  if ("response" in body) return body.response;
  try {
    const result = await respond(getDb(), session.user.id, body.data.userId, body.data.accept, Date.now());
    if (!result.ok) return error(MESSAGES.gone, 404);
    return json({ state: result.state }, 200);
  } catch (cause) {
    console.error("Friend request answer failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

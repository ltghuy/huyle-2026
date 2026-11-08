import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { removeFriend } from "@/server/social/friends.service";
import { error, readBody } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES, requestBodySchema } from "@/server/social/social.schema";

// "Xóa bạn" (feature 031, AC-020): ends the friendship for both learners.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, requestBodySchema);
  if ("response" in body) return body.response;
  try {
    await removeFriend(getDb(), session.user.id, body.data.userId);
    return new Response(null, { status: 204 });
  } catch (cause) {
    console.error("Friend removal failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

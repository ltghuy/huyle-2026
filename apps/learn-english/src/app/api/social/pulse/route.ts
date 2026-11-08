import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { pulse } from "@/server/social/pulse.service";
import { error, json } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES } from "@/server/social/social.schema";

// One tab's check-in (feature 031): marks the learner active and returns their friends, request
// ids and unread count. Only the caller's own data, so it takes no user id. One D1 batch.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    return json(await pulse(getDb(), session.user.id, Date.now()), 200);
  } catch (cause) {
    console.error("Social pulse failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

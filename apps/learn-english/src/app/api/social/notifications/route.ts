import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { listNotifications } from "@/server/social/notifications.service";
import { error, json } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES } from "@/server/social/social.schema";

// The signed-in learner's bell (feature 031, AC-024): their own 50 newest notifications.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    return json(await listNotifications(getDb(), session.user.id, Date.now()), 200);
  } catch (cause) {
    console.error("Notifications failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

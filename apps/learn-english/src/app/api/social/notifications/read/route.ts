import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { markAllRead } from "@/server/social/notifications.service";
import { error } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES } from "@/server/social/social.schema";

// The learner opened the bell (feature 031, AC-024): every notification counts as read.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    await markAllRead(getDb(), session.user.id, Date.now());
    return new Response(null, { status: 204 });
  } catch (cause) {
    console.error("Marking notifications read failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

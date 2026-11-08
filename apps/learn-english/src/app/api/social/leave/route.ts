import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { leave } from "@/server/social/presence.service";
import { error } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES } from "@/server/social/social.schema";

// The last open tab's goodbye (feature 031), sent with `navigator.sendBeacon` on `pagehide`:
// the learner shows offline at once instead of after the 150 s window.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    await leave(getDb(), session.user.id, Date.now());
    return new Response(null, { status: 204 });
  } catch (cause) {
    console.error("Social leave failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

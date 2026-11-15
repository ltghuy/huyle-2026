import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { adminContact } from "@/server/social/admin-contact.service";
import { error, json } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES } from "@/server/social/social.schema";

// The admin a learner can befriend from the bell (feature 044, AC-004); none for admins.
export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  try {
    return json(await adminContact(getDb(), session.user.id), 200);
  } catch (cause) {
    console.error("Admin contact failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

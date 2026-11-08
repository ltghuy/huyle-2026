import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { sendRequest } from "@/server/social/friends.service";
import { error, isThrottled, json, readBody } from "@/server/social/request";
import { SOCIAL_MESSAGES as MESSAGES, requestBodySchema } from "@/server/social/social.schema";

const FAILURES: Record<"self" | "notFound" | "tooMany", [message: string, status: number]> = {
  self: [MESSAGES.self, 422],
  notFound: [MESSAGES.notFound, 404],
  tooMany: [MESSAGES.tooMany, 409],
};

// "Kết bạn" (feature 031, AC-003, AC-008): sends a request from the signed-in learner, or
// accepts the other learner's waiting one. Throttled per IP.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, requestBodySchema);
  if ("response" in body) return body.response;
  if (await isThrottled(request)) return error(MESSAGES.throttled, 429);
  try {
    const result = await sendRequest(getDb(), session.user.id, body.data.userId, Date.now());
    if (!result.ok) return error(...FAILURES[result.reason]);
    return json({ state: result.state }, 200);
  } catch (cause) {
    console.error("Friend request failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}

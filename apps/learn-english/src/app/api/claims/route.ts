import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { CLAIMS_MESSAGES as MESSAGES, claimsRequestSchema, type ClaimsResponse } from "@/server/claims/claims.schema";
import { submitClaims } from "@/server/claims/claims.service";
import { claimsError, isClaimsThrottled, NO_STORE, readClaimsBody } from "@/server/claims/request";

// Translation claims (feature 016): stores up to 10 claims and answers the ids
// it kept. Refused ones (over the daily limit) are left out of `accepted`.

export async function POST(request: Request) {
  // Signed-in learners only (feature 022, AC-013): claims come from exercises.
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readClaimsBody(request, claimsRequestSchema);
  if ("response" in body) return body.response;
  if (await isClaimsThrottled(request)) return claimsError(MESSAGES.throttled, 429);
  try {
    const accepted = await submitClaims(getDb(), body.data, getEnv().STATS_SALT, Date.now());
    return Response.json({ accepted } satisfies ClaimsResponse, { headers: NO_STORE });
  } catch {
    // Nothing from the request is logged: it holds the learner's answers.
    console.error("Claims write failed");
    return claimsError(MESSAGES.unavailable, 503);
  }
}

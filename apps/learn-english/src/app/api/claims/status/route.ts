import { getDb } from "@/server/db";
import { CLAIMS_MESSAGES as MESSAGES, claimStatusRequestSchema, type ClaimStatusResponse } from "@/server/claims/claims.schema";
import { claimStatuses } from "@/server/claims/claims.service";
import { claimsError, isClaimsThrottled, NO_STORE, readClaimsBody } from "@/server/claims/request";

// The owner's decisions on translation claims (feature 016). POST, so the ids
// stay out of URLs and caches; unknown ids are left out of the answer.

export async function POST(request: Request) {
  const body = await readClaimsBody(request, claimStatusRequestSchema);
  if ("response" in body) return body.response;
  if (await isClaimsThrottled(request)) return claimsError(MESSAGES.throttled, 429);
  try {
    const claims = await claimStatuses(getDb(), body.data.ids);
    return Response.json({ claims } satisfies ClaimStatusResponse, { headers: NO_STORE });
  } catch {
    console.error("Claims status read failed");
    return claimsError(MESSAGES.unavailable, 503);
  }
}

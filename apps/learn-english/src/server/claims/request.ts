import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { z } from "zod";
import { jsonError } from "@/lib/http";
import { CLAIMS_MESSAGES as MESSAGES, MAX_CLAIMS_BODY_BYTES } from "./claims.schema";

// Request handling shared by /api/claims and /api/claims/status: every
// response is `no-store`, the body is size-capped before it is parsed, and
// each IP is rate limited.

export const NO_STORE = { "Cache-Control": "no-store" };

/** The API error shape (`src/lib/http.ts`), uncached. */
export function claimsError(message: string, status: number, issues?: unknown): Response {
  const response = jsonError(message, status, issues);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/**
 * Reads and validates a JSON body of at most MAX_CLAIMS_BODY_BYTES: 413 when
 * larger (checked on the header first, then on the bytes read), 400 when it
 * isn't JSON or doesn't match the schema.
 */
export async function readClaimsBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  if (Number(request.headers.get("content-length")) > MAX_CLAIMS_BODY_BYTES) return { response: claimsError(MESSAGES.tooLarge, 413) };
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_CLAIMS_BODY_BYTES) return { response: claimsError(MESSAGES.tooLarge, 413) };
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { response: claimsError(MESSAGES.invalidJson, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: claimsError(MESSAGES.invalidBody, 400, parsed.error.issues) };
  return { data: parsed.data };
}

/**
 * Counts one request for the caller's IP and says whether it must wait (the
 * `CLAIMS_LIMITER` binding). The IP is only the limiter key, in memory; it is
 * never stored. Without the binding (some local setups) nothing is throttled.
 */
export async function isClaimsThrottled(request: Request): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limiter = getCloudflareContext().env.CLAIMS_LIMITER;
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (error) {
    console.warn("Claims limiter unavailable:", error);
    return false;
  }
}

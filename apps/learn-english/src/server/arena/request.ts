import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { z } from "zod";
import { ARENA_MESSAGES } from "./arena.schema";

// Helpers shared by the Arena routes (feature 023), as each route family in the
// app keeps its own: JSON responses that are never cached, a capped body
// reader, and the per-IP limiter.

const NO_STORE = { "Cache-Control": "no-store" };
/** Bodies are a few dozen bytes; anything far larger is refused unread. */
const MAX_BODY_BYTES = 1024;

export function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function error(message: string, status: number, issues?: unknown): Response {
  return json({ error: { message, ...(issues ? { issues } : {}) } }, status);
}

export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<{ data: z.infer<T> } | { response: Response }> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return { response: error(ARENA_MESSAGES.invalidBody, 413) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: error(ARENA_MESSAGES.invalidJson, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: error(ARENA_MESSAGES.invalidBody, 422, parsed.error.issues) };
  return { data: parsed.data };
}

/**
 * Counts one create or join for the caller's IP and says whether it must wait (`ARENA_LIMITER`:
 * 20 per 60 s). The IP is only the limiter key, never stored. Without the binding nothing is
 * throttled rather than failing.
 */
export async function isThrottled(request: Request): Promise<boolean> {
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const limiter = getCloudflareContext().env.ARENA_LIMITER;
    if (!limiter) return false;
    const { success } = await limiter.limit({ key });
    return !success;
  } catch (cause) {
    console.warn("Arena limiter unavailable:", cause);
    return false;
  }
}

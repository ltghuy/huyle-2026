import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { requireUser, type SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { user } from "@/server/db/schema";
import { ADMIN_MESSAGES } from "./admin.schema";

// Helpers for the admin routes (feature 038): the admin check, never-cached JSON, a capped body reader.

const NO_STORE = { "Cache-Control": "no-store" };
/** Content bodies run to a few KB; anything far larger is refused unread. */
const MAX_BODY_BYTES = 64 * 1024;

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function error(message: string, status: number, issues?: unknown): Response {
  return json({ error: { message, ...(issues ? { issues } : {}) } }, status);
}

/**
 * The signed-in admin, or the response to send instead (AC-003): 401 for guests, 403 for everyone
 * else. `is_admin` is read from D1 on every call, not from the session cookie, which is cached for
 * minutes, so taking the flag away works on the next request.
 */
export async function requireAdmin(request: Request, db = getDb()): Promise<{ user: SessionUser } | { response: Response }> {
  const session = await requireUser(request);
  if ("response" in session) return session;
  try {
    const rows = await db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!rows[0]?.isAdmin) return { response: error(ADMIN_MESSAGES.forbidden, 403) };
    return session;
  } catch (cause) {
    console.error("Admin check failed:", cause);
    return { response: error(ADMIN_MESSAGES.unavailable, 503) };
  }
}

export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<{ data: z.infer<T> } | { response: Response }> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return { response: error(ADMIN_MESSAGES.tooLarge, 413) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: error(ADMIN_MESSAGES.invalidJson, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: error(ADMIN_MESSAGES.invalidBody, 422, parsed.error.issues) };
  return { data: parsed.data };
}

/** Query string parameters as an object, for a Zod schema. */
export function readQuery<T extends z.ZodType>(request: Request, schema: T): { data: z.infer<T> } | { response: Response } {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) return { response: error(ADMIN_MESSAGES.invalidBody, 422, parsed.error.issues) };
  return { data: parsed.data };
}

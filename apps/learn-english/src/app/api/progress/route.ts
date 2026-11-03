import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import {
  PROGRESS_MESSAGES as MESSAGES,
  putProgressBodySchema,
  type GetProgressResponse,
  type ProgressConflictResponse,
  type PutProgressResponse,
} from "@/server/progress/progress.schema";
import { getProgress, putProgress } from "@/server/progress/progress.service";

// A signed-in learner's progress (feature 022, AC-014–AC-018). The account comes from the session
// cookie; every response is `no-store`.

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function error(message: string, status: number, issues?: unknown): Response {
  return json({ error: { message, ...(issues ? { issues } : {}) } }, status);
}

function unavailable(scope: string, cause: unknown): Response {
  console.error(`Progress ${scope} failed:`, cause);
  return error(MESSAGES.unavailable, 503);
}

export async function GET(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  let result;
  try {
    result = await getProgress(getDb(), session.user.id);
  } catch (cause) {
    return unavailable("read", cause);
  }
  if (!result.ok) return error(MESSAGES.notFound, 404);
  const { rev, data, updatedAt } = result;
  return json({ rev, data, updatedAt } satisfies GetProgressResponse, 200);
}

export async function PUT(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  let env;
  try {
    env = getEnv();
  } catch (cause) {
    return unavailable("env", cause);
  }
  // base64 is 4/3 of the bytes; 1 KB covers the JSON around it. Refused before the body is read.
  if (Number(request.headers.get("content-length")) > Math.ceil(env.SYNC_MAX_BYTES / 3) * 4 + 1024) return error(MESSAGES.tooLarge, 413);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(MESSAGES.invalidJson, 400);
  }
  const parsed = putProgressBodySchema.safeParse(body);
  if (!parsed.success) return error(MESSAGES.invalidBody, 422, parsed.error.issues);

  let result;
  try {
    result = await putProgress(getDb(), session.user.id, parsed.data, { now: Date.now(), maxBytes: env.SYNC_MAX_BYTES, salt: env.STATS_SALT });
  } catch (cause) {
    return unavailable("write", cause);
  }
  if (result.ok) return json({ rev: result.rev } satisfies PutProgressResponse, 200);
  if (result.reason === "conflict") return json({ error: { message: MESSAGES.conflict }, rev: result.rev } satisfies ProgressConflictResponse, 409);
  return error(MESSAGES.tooLarge, 413);
}

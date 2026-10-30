import type { z } from "zod";
import { checkBoardName, daysBetween } from "@/learning/leaderboard";
import { getDb } from "@/server/db";
import {
  LEADERBOARD_MESSAGES as MESSAGES,
  removeBodySchema,
  submitBodySchema,
  type SubmitResponse,
} from "@/server/leaderboard/leaderboard.schema";
import { removeEntry, submitEntry } from "@/server/leaderboard/leaderboard.service";
import { hashToken, isWriteThrottled } from "@/server/leaderboard/secret";

// The leaderboard (feature 007, ranked by streak since 013). The token is the
// entry's secret and travels only in the body; every response is `no-store`.

const NO_STORE = { "Cache-Control": "no-store" };
/** Bodies are a few hundred bytes; anything far larger is refused unread. */
const MAX_BODY_BYTES = 2048;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function error(message: string, status: number, issues?: unknown): Response {
  return json({ error: { message, ...(issues ? { issues } : {}) } }, status);
}

type Parsed<T> = { data: T } | { response: Response };

async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<Parsed<z.infer<T>>> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return { response: error(MESSAGES.invalidBody, 413) };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: error(MESSAGES.invalidJson, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: error(MESSAGES.invalidBody, 422, parsed.error.issues) };
  return { data: parsed.data };
}

function unavailable(scope: string, cause: unknown): Response {
  console.error(`Leaderboard ${scope} failed:`, cause);
  return error(MESSAGES.unavailable, 503);
}

export async function POST(request: Request) {
  const body = await readBody(request, submitBodySchema);
  if ("response" in body) return body.response;
  // The same name rules as the browser (AC-013), whatever it sent.
  const name = checkBoardName(body.data.name);
  if (!name.ok) return error(name.message, 422);
  // Every time zone's date is within a day of UTC's (013 AC-016).
  if (Math.abs(daysBetween(new Date().toISOString().slice(0, 10), body.data.today)) > 1) return error(MESSAGES.invalidBody, 422);
  if (await isWriteThrottled(request)) return error(MESSAGES.throttled, 429);

  const { token, ...entry } = body.data;
  try {
    const result = await submitEntry(getDb(), { ...entry, name: name.name, tokenHash: await hashToken(token) }, Date.now());
    if (!result.ok) return result.reason === "implausible" ? error(MESSAGES.implausible, 422) : error(MESSAGES.forbidden, 403);
    const response: SubmitResponse = { rank: result.rank, previousRank: result.previousRank, total: result.total, rows: result.rows };
    return json(response, 200);
  } catch (cause) {
    return unavailable("submit", cause);
  }
}

export async function DELETE(request: Request) {
  const body = await readBody(request, removeBodySchema);
  if ("response" in body) return body.response;
  if (await isWriteThrottled(request)) return error(MESSAGES.throttled, 429);
  try {
    const result = await removeEntry(getDb(), body.data.id, await hashToken(body.data.token));
    if (!result.ok) return error(MESSAGES.forbidden, 403);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (cause) {
    return unavailable("remove", cause);
  }
}

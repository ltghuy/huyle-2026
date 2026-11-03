import { requireUser } from "@/server/auth/session";
import type { z } from "zod";
import { checkBoardName, daysBetween } from "@/learning/leaderboard";
import { getDb } from "@/server/db";
import {
  BOARD_ID_HEADER,
  LEADERBOARD_MESSAGES as MESSAGES,
  removeBodySchema,
  submitBodySchema,
  topQuerySchema,
  type SubmitResponse,
} from "@/server/leaderboard/leaderboard.schema";
import { dropOtherEntries, removeAccountEntries, removeEntry, submitEntry, topEntries } from "@/server/leaderboard/leaderboard.service";
import { hashToken, isWriteThrottled } from "@/server/leaderboard/secret";

// The leaderboard (feature 007, ranked by streak since 013). Since feature 022
// it ranks Google accounts: the entry's id is the account id, and the shown name
// is the learner's chosen name, else their Google name. The browser-made id and
// token still travel in the body, only to retire that older entry. Every
// response is `no-store`.

/** The chosen name when it passes the board rules, else the Google name, else a neutral one. */
function boardName(chosen: string, googleName: string): string {
  for (const candidate of [chosen, googleName]) {
    const checked = checkBoardName(candidate);
    if (checked.ok) return checked.name;
  }
  return "Học viên";
}

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

/** The top 10 (feature 017): `?today=` is the learner's local date; their entry id, if any, comes in a header. */
export async function GET(request: Request) {
  // Signed-in learners only (feature 022, AC-011, AC-013).
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const query = topQuerySchema.safeParse({
    today: new URL(request.url).searchParams.get("today") ?? undefined,
    id: request.headers.get(BOARD_ID_HEADER) ?? undefined,
  });
  if (!query.success) return error(MESSAGES.invalidBody, 422, query.error.issues);
  // As for POST: every time zone's date is within a day of UTC's.
  if (Math.abs(daysBetween(new Date().toISOString().slice(0, 10), query.data.today)) > 1) return error(MESSAGES.invalidBody, 422);
  try {
    return json(await topEntries(getDb(), query.data.today, session.user.id), 200);
  } catch (cause) {
    return unavailable("top", cause);
  }
}

export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, submitBodySchema);
  if ("response" in body) return body.response;
  // A chosen name breaks the same rules as in the browser (AC-013); none means the Google name.
  const chosen = body.data.name.trim();
  if (chosen) {
    const checked = checkBoardName(chosen);
    if (!checked.ok) return error(checked.message, 422);
  }
  const name = boardName(chosen, session.user.name);
  // Every time zone's date is within a day of UTC's (013 AC-016).
  if (Math.abs(daysBetween(new Date().toISOString().slice(0, 10), body.data.today)) > 1) return error(MESSAGES.invalidBody, 422);
  if (await isWriteThrottled(request)) return error(MESSAGES.throttled, 429);

  const { token, id: oldId, ...entry } = body.data;
  const userId = session.user.id;
  try {
    const db = getDb();
    await dropOtherEntries(db, userId, { id: oldId, tokenHash: await hashToken(token) });
    const result = await submitEntry(db, { ...entry, id: userId, name, tokenHash: await hashToken(userId), userId }, Date.now());
    if (!result.ok) return result.reason === "implausible" ? error(MESSAGES.implausible, 422) : error(MESSAGES.forbidden, 403);
    const response: SubmitResponse = { rank: result.rank, previousRank: result.previousRank, total: result.total, rows: result.rows };
    return json(response, 200);
  } catch (cause) {
    return unavailable("submit", cause);
  }
}

export async function DELETE(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, removeBodySchema);
  if ("response" in body) return body.response;
  if (await isWriteThrottled(request)) return error(MESSAGES.throttled, 429);
  try {
    const db = getDb();
    await removeAccountEntries(db, session.user.id);
    // An older browser-made entry, if this browser still holds one.
    await removeEntry(db, body.data.id, await hashToken(body.data.token));
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (cause) {
    return unavailable("remove", cause);
  }
}

import "server-only";

import { issueToken, verifyToken } from "./token-lab.service";
import type { CookieLogEntry, SameSite } from "./jwt.schema";

// The storage demo's API: it sets the token as an HttpOnly cookie scoped to
// this lab's path, accepts it from that cookie or an Authorization header,
// and logs, per run, how each request was authenticated and where it came from.

export const COOKIE_NAME = "hb_jwt";
const COOKIE_PATH = "/api/handbook/jwt";
const MAX_RUNS = 200;
const MAX_LOG = 50;
const g = globalThis as { __jwtCookieLab?: Map<string, CookieLogEntry[]> };
const store = (g.__jwtCookieLab ??= new Map());

function logFor(run: string) {
  let log = store.get(run);
  if (!log) {
    log = [];
    store.set(run, log);
    if (store.size > MAX_RUNS) store.delete(store.keys().next().value!);
  }
  return log;
}

export function setCookieHeader(sameSite: SameSite) {
  const token = issueToken({ alg: "ES256", sub: "alice", role: "reader", ttl: 600 });
  // Secure is required for SameSite=None; browsers treat http://localhost as secure.
  return `${COOKIE_NAME}=${token}; Path=${COOKIE_PATH}; Max-Age=600; HttpOnly; Secure; SameSite=${sameSite}`;
}

export function clearCookieHeader() {
  return `${COOKIE_NAME}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(header: string | null) {
  for (const part of header?.split(";") ?? []) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

export function handleCookieApi(request: Request, run: string, n: number, from: CookieLogEntry["from"]): Response {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  // The "other site" is a sandboxed frame (Origin: null); let it read answers so the demo can show them.
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "Authorization");
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const cookie = readCookie(request.headers.get("cookie"));
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1] ?? null;
  const token = bearer ?? cookie;
  const via: CookieLogEntry["via"] = bearer ? "header" : cookie ? "cookie" : "none";
  const result = token ? verifyToken(token) : null;
  const ok = !!result?.valid;
  const detail = !token
    ? "No token arrived: no cookie and no Authorization header."
    : ok
      ? `Authenticated as ${String(result!.payload?.sub)} from the ${via === "header" ? "Authorization header" : "cookie"}.`
      : `A token arrived but was rejected: ${result!.checks.find((c) => c.status === "fail")?.detail}`;
  const log = logFor(run);
  log.push({ n, at: Date.now(), from, via, origin, fetchSite: request.headers.get("sec-fetch-site"), ok, detail });
  if (log.length > MAX_LOG) log.shift();
  return Response.json(ok ? { data: { ok, via, sub: result!.payload?.sub } } : { error: { message: detail } }, { status: ok ? 200 : 401, headers });
}

export function cookieLog(run: string): CookieLogEntry[] {
  return store.get(run) ?? [];
}

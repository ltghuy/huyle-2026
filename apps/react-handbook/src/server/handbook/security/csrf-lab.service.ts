import "server-only";

import { randomBytes } from "node:crypto";

import type { CsrfLogEntry, CsrfState, Defence, SameSite } from "./security.schema";

// The CSRF demo's "bank": a session cookie protects a state-changing action
// (a transfer that lowers a balance). The learner picks the cookie's SameSite
// and a CSRF defence, then has another site try the request. The server logs
// what arrived and whether it performed the action. One session per browser.

type Session = { sid: string; sameSite: SameSite; defence: Defence; token: string; balance: number; log: CsrfLogEntry[] };

export const COOKIE_NAME = "hb_csrf_session";
const COOKIE_PATH = "/api/handbook/security/csrf";
const START_BALANCE = 1000;
const MAX_SESSIONS = 200;
const MAX_LOG = 50;
const g = globalThis as { __csrfLab?: Map<string, Session> };
const store = (g.__csrfLab ??= new Map());

function newToken() {
  return randomBytes(12).toString("base64url");
}

export function login(sameSite: SameSite, defence: Defence): { state: CsrfState; sid: string; setCookie: string } {
  const sid = randomBytes(8).toString("hex");
  const session: Session = { sid, sameSite, defence, token: newToken(), balance: START_BALANCE, log: [] };
  store.set(sid, session);
  if (store.size > MAX_SESSIONS) store.delete(store.keys().next().value!);
  // Secure is required for SameSite=None; browsers treat http://localhost as secure.
  const setCookie = `${COOKIE_NAME}=${sid}; Path=${COOKIE_PATH}; Max-Age=1800; HttpOnly; Secure; SameSite=${sameSite}`;
  return { state: stateOf(session), sid, setCookie };
}

function stateOf(session: Session): CsrfState {
  return { sameSite: session.sameSite, defence: session.defence, balance: session.balance, token: session.token };
}

function readCookieSid(header: string | null): string | null {
  for (const part of header?.split(";") ?? []) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

export function reset(sid: string): CsrfState | null {
  const session = store.get(sid);
  if (!session) return null;
  session.balance = START_BALANCE;
  session.log = [];
  return stateOf(session);
}

type DoParams = { sid: string; n: number; from: "page" | "other-site" | "subdomain"; amount: number };

export function doTransfer(request: Request, params: DoParams): Response {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  // Let the opaque-origin frame read answers so the demo can show them; the
  // custom header is only allowed when the server opts in, which is the point.
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    if (request.method === "OPTIONS") headers.set("Access-Control-Allow-Headers", "X-CSRF-Token, Content-Type");
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

  const cookieSid = readCookieSid(request.headers.get("cookie"));
  // The session is addressed by sid for logging, but only a matching cookie authenticates.
  const session = store.get(params.sid);
  if (!session) return Response.json({ error: { message: "Unknown session." } }, { status: 404, headers });

  const cookiePresent = cookieSid === session.sid;
  const sentToken = request.headers.get("x-csrf-token") ?? new URL(request.url).searchParams.get("token");
  const tokenOk = sentToken === session.token;
  const headerOk = request.headers.get("x-requested-with") === "fetch";

  let applied = false;
  let detail: string;
  if (!cookiePresent) {
    detail = "No session cookie arrived, so the server treated the caller as logged out.";
  } else if (session.defence === "token" && !tokenOk) {
    detail = "Cookie present, but the anti-CSRF token was missing or wrong.";
  } else if (session.defence === "header" && !headerOk) {
    detail = "Cookie present, but the required custom header was absent (a cross-site form can't set one).";
  } else {
    applied = true;
    session.balance = Math.max(0, session.balance - params.amount);
    detail = `Transfer of ${params.amount} applied. Balance is now ${session.balance}.`;
  }

  session.log.push({
    n: params.n,
    at: Date.now(),
    from: params.from,
    method: request.method,
    origin,
    fetchSite: request.headers.get("sec-fetch-site"),
    cookie: cookiePresent,
    tokenOk,
    headerOk,
    applied,
    detail,
  });
  if (session.log.length > MAX_LOG) session.log.shift();

  return Response.json(applied ? { data: { applied, balance: session.balance } } : { error: { message: detail } }, { status: applied ? 200 : 403, headers });
}

export function csrfLog(sid: string): { entries: CsrfLogEntry[]; state: CsrfState } | null {
  const session = store.get(sid);
  return session ? { entries: session.log, state: stateOf(session) } : null;
}

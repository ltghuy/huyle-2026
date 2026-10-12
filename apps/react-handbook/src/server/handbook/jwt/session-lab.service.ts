import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { demoKeys, signWithKey, verifyJwt } from "./jws";
import {
  AUDIENCE,
  ISSUER,
  STRICT,
  type Revocation,
  type SessionLogEntry,
  type SessionState,
  type TokenPair,
  type VerifyResult,
} from "./jwt.schema";

// The lifecycle demo's auth server: short-lived access JWTs, opaque refresh
// tokens stored only as hashes and rotated on every use, reuse detection that
// revokes the whole session, and two ways to revoke access tokens early
// (a deny-list of token ids, or a per-user token version). One session per
// browser tab, on globalThis.

type RefreshEntry = { id: string; status: "current" | "used" | "revoked" };
type Session = {
  sid: string;
  accessTtl: number;
  revocation: Revocation;
  version: number;
  /** Access tokens issued in this session, so they can be deny-listed. */
  issued: Map<string, number>;
  denylist: Map<string, number>;
  refresh: Map<string, RefreshEntry>;
  revoked: boolean;
  log: SessionLogEntry[];
};

type Actor = "user" | "attacker";
export type LabResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string; data?: unknown };

const MAX_SESSIONS = 200;
const MAX_LOG = 100;
const g = globalThis as { __jwtSessions?: Map<string, Session> };
const sessions = (g.__jwtSessions ??= new Map());

const nowSeconds = () => Math.floor(Date.now() / 1000);
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function log(session: Session, actor: SessionLogEntry["actor"], kind: string, ok: boolean, detail: string) {
  session.log.push({ at: Date.now(), actor, kind, ok, detail });
  if (session.log.length > MAX_LOG) session.log.shift();
}

function prune(session: Session) {
  const cutoff = nowSeconds() - 120; // longest leeway the demo allows
  for (const [jti, exp] of session.denylist) if (exp < cutoff) session.denylist.delete(jti);
  for (const [jti, exp] of session.issued) if (exp < cutoff) session.issued.delete(jti);
}

function issuePair(session: Session): TokenPair {
  const iat = nowSeconds();
  const jti = randomBytes(6).toString("hex");
  const exp = iat + session.accessTtl;
  const accessToken = signWithKey(demoKeys().es, {
    iss: ISSUER,
    sub: "alice",
    aud: AUDIENCE,
    sid: session.sid,
    ver: session.version,
    iat,
    exp,
    jti,
  });
  session.issued.set(jti, exp);
  const refreshToken = randomBytes(32).toString("base64url");
  const digest = hash(refreshToken);
  session.refresh.set(digest, { id: digest.slice(0, 8), status: "current" });
  return { sid: session.sid, accessToken, refreshToken, expiresAt: exp * 1000 };
}

export function login(accessTtl: number, revocation: Revocation): TokenPair {
  const sid = randomBytes(8).toString("hex");
  const session: Session = {
    sid,
    accessTtl,
    revocation,
    version: 1,
    issued: new Map(),
    denylist: new Map(),
    refresh: new Map(),
    revoked: false,
    log: [],
  };
  sessions.set(sid, session);
  if (sessions.size > MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
  const pair = issuePair(session);
  log(session, "user", "sign in", true, `Access token for ${accessTtl} s and a refresh token (revocation: ${revocation}).`);
  return pair;
}

function revokeAccessTokens(session: Session) {
  if (session.revocation === "denylist") {
    for (const [jti, exp] of session.issued) session.denylist.set(jti, exp);
    return `${session.issued.size} access token id(s) added to the deny-list.`;
  }
  if (session.revocation === "version") {
    session.version += 1;
    return `Token version bumped to ${session.version}: older access tokens are rejected.`;
  }
  return "No server-side state for access tokens: those already issued keep working until they expire.";
}

export function refresh(sid: string, refreshToken: string, actor: Actor): LabResult<TokenPair> {
  const session = sessions.get(sid);
  if (!session) return { ok: false, status: 401, message: "Unknown session: the server may have restarted. Sign in again." };
  prune(session);
  const entry = session.refresh.get(hash(refreshToken));
  if (!entry) {
    log(session, actor, "refresh", false, "Unknown refresh token.");
    return { ok: false, status: 401, message: "Unknown refresh token." };
  }
  if (entry.status === "used") {
    // A rotated-out token came back: one of the two holders is a thief, and the server can't tell which.
    session.revoked = true;
    for (const e of session.refresh.values()) e.status = "revoked";
    const access = revokeAccessTokens(session);
    log(session, actor, "refresh", false, `Reuse detected: refresh token ${entry.id} was already used. Whole session revoked. ${access}`);
    return { ok: false, status: 401, message: "Refresh token reuse detected: the whole session was revoked." };
  }
  if (entry.status === "revoked" || session.revoked) {
    log(session, actor, "refresh", false, `Refresh token ${entry.id} belongs to a revoked session.`);
    return { ok: false, status: 401, message: "This session was revoked. Sign in again." };
  }
  entry.status = "used";
  const pair = issuePair(session);
  log(session, actor, "refresh", true, `Refresh token ${entry.id} used and retired; a new pair was issued.`);
  return { ok: true, data: pair };
}

export function callApi(sid: string, authorization: string | null, leeway: number, actor: Actor): LabResult<VerifyResult> {
  const session = sessions.get(sid);
  if (!session) return { ok: false, status: 401, message: "Unknown session: the server may have restarted. Sign in again." };
  prune(session);
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) {
    log(session, actor, "API call", false, "No Authorization: Bearer header.");
    return { ok: false, status: 401, message: "No access token sent." };
  }
  const result = verifyJwt(token, { keys: [demoKeys().es], checks: STRICT, issuer: ISSUER, audience: AUDIENCE, leeway });
  if (result.valid) {
    const { jti, ver, sid: tokenSid } = result.payload as { jti?: string; ver?: number; sid?: string };
    let detail = "Not checked: with no revocation state, a valid signature and exp are all the API looks at.";
    let pass = true;
    if (tokenSid !== sid) [pass, detail] = [false, "Token belongs to another session."];
    else if (session.revocation === "denylist") {
      pass = !(jti && session.denylist.has(jti));
      detail = pass ? `Token id ${jti} is not on the deny-list (${session.denylist.size} entries).` : `Token id ${jti} is on the deny-list.`;
    } else if (session.revocation === "version") {
      pass = ver === session.version;
      detail = pass ? `Token version ${ver} is current.` : `Token version ${ver} is older than the user's version ${session.version}.`;
    }
    result.checks.push({ id: "session", status: pass ? "pass" : "fail", detail });
    if (!pass) Object.assign(result, { valid: false, failedAt: "session" });
  }
  const failed = result.checks.find((c) => c.status === "fail");
  log(session, actor, "API call", result.valid, result.valid ? "200: access token accepted." : `401: ${failed?.detail ?? "rejected"}`);
  return result.valid ? { ok: true, data: result } : { ok: false, status: 401, message: failed?.detail ?? "Rejected.", data: result };
}

export function logout(sid: string): LabResult<{ detail: string }> {
  const session = sessions.get(sid);
  if (!session) return { ok: false, status: 401, message: "Unknown session." };
  for (const e of session.refresh.values()) e.status = "revoked";
  session.revoked = true;
  const access = revokeAccessTokens(session);
  const detail = `Refresh tokens revoked. ${access}`;
  log(session, "user", "sign out", true, detail);
  return { ok: true, data: { detail } };
}

export function sessionLog(sid: string): { entries: SessionLogEntry[]; state: SessionState } | null {
  const session = sessions.get(sid);
  if (!session) return null;
  prune(session);
  return {
    entries: session.log,
    state: {
      revocation: session.revocation,
      revoked: session.revoked,
      version: session.version,
      denylist: [...session.denylist].map(([jti, exp]) => ({ jti, exp })),
      refreshTokens: [...session.refresh.values()].map(({ id, status }) => ({ id, status })),
    },
  };
}

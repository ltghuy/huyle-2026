import { z } from "zod";

import { MAX_TOKEN_LENGTH } from "./jwt-format";

// Request bodies and results of the JWT labs. Client-safe: the demos share the types.

export const ALGS = ["HS256", "RS256", "ES256"] as const;
export type Alg = (typeof ALGS)[number];

export const ROLES = ["reader", "editor", "admin"] as const;

/** What this site's demo issuer and API expect. */
export const ISSUER = "https://auth.handbook.example";
export const AUDIENCE = "handbook-api";

const tokenText = z.string().max(MAX_TOKEN_LENGTH);
const runId = z.string().regex(/^[a-z0-9-]{4,40}$/);

export const issueSchema = z.object({
  alg: z.enum(ALGS),
  sub: z.string().regex(/^[\w.@-]{1,40}$/),
  role: z.enum(ROLES),
  /** Lifetime in seconds; negative issues an already expired token. */
  ttl: z.number().int().min(-3600).max(86400),
});
export type IssueInput = z.infer<typeof issueSchema>;

export const verifySchema = z.object({ token: tokenText });

export const verifyChecksSchema = z.object({
  /** Only the algorithm registered for the key; never "none". */
  pinAlg: z.boolean(),
  /** Keys only from the server's own key set by kid; ignore keys inside the token. */
  serverKeys: z.boolean(),
  /** exp and nbf. */
  exp: z.boolean(),
  iss: z.boolean(),
  aud: z.boolean(),
});
export type VerifyChecks = z.infer<typeof verifyChecksSchema>;

export const STRICT: VerifyChecks = { pinAlg: true, serverKeys: true, exp: true, iss: true, aud: true };
export const NAIVE: VerifyChecks = { pinAlg: false, serverKeys: false, exp: false, iss: false, aud: false };

export const ATTACKS = ["alg-none", "key-confusion", "embedded-jwk", "expired", "wrong-audience", "wrong-issuer"] as const;
export type AttackId = (typeof ATTACKS)[number];

export const attackSchema = z.object({ attack: z.enum(ATTACKS), checks: verifyChecksSchema });

export type CheckId = "format" | "alg" | "key" | "signature" | "exp" | "nbf" | "iss" | "aud" | "session";
export type CheckStatus = "pass" | "fail" | "skipped";
export type CheckResult = { id: CheckId; status: CheckStatus; detail: string };

export type VerifyResult = {
  valid: boolean;
  checks: CheckResult[];
  failedAt: CheckId | null;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
};

export type AttackResult = { token: string; naive: VerifyResult; strict: VerifyResult; publicKeyPem: string };

// Lifecycle lab

export const REVOCATIONS = ["none", "denylist", "version"] as const;
export type Revocation = (typeof REVOCATIONS)[number];

const sid = z.string().regex(/^[a-f0-9]{16}$/);

export const sessionActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), accessTtl: z.number().int().min(5).max(300), revocation: z.enum(REVOCATIONS) }),
  z.object({ action: z.literal("refresh"), sid, refreshToken: z.string().max(200), actor: z.enum(["user", "attacker"]) }),
  z.object({ action: z.literal("logout"), sid }),
]);
export type SessionAction = z.infer<typeof sessionActionSchema>;

export const sessionApiSchema = z.object({
  sid,
  leeway: z.coerce.number().int().min(0).max(120),
  actor: z.enum(["user", "attacker"]),
});
export const sessionLogSchema = z.object({ sid });

export type TokenPair = { sid: string; accessToken: string; refreshToken: string; expiresAt: number };

export type SessionLogEntry = { at: number; actor: "user" | "attacker" | "server"; kind: string; ok: boolean; detail: string };
export type SessionState = {
  revocation: Revocation;
  revoked: boolean;
  version: number;
  denylist: { jti: string; exp: number }[];
  refreshTokens: { id: string; status: "current" | "used" | "revoked" }[];
};

// Storage lab

export const SAME_SITES = ["Strict", "Lax", "None"] as const;
export type SameSite = (typeof SAME_SITES)[number];

export const cookieSetSchema = z.object({ run: runId, sameSite: z.enum(SAME_SITES) });
export const cookieRunSchema = z.object({ run: runId });
export const cookieApiSchema = z.object({ run: runId, n: z.coerce.number().int().min(0).max(100000), from: z.enum(["page", "script", "other-site"]) });

export type CookieLogEntry = {
  n: number;
  at: number;
  from: "page" | "script" | "other-site";
  via: "cookie" | "header" | "none";
  origin: string | null;
  fetchSite: string | null;
  ok: boolean;
  detail: string;
};

// Key ring lab

export const keysQuerySchema = z.object({ run: runId });
export const keysActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), run: runId }),
  z.object({ action: z.literal("promote"), run: runId, kid: z.string().max(40) }),
  z.object({ action: z.literal("retire"), run: runId, kid: z.string().max(40) }),
  z.object({ action: z.literal("sign"), run: runId }),
  z.object({ action: z.literal("verify"), run: runId, token: tokenText }),
]);

export type PublicJwk = Record<string, string>;
export type RingKey = { kid: string; status: "signing" | "published" | "retired"; createdAt: number };
export type RingView = { keys: RingKey[]; jwks: { keys: PublicJwk[] } };

import "server-only";

import { randomBytes } from "node:crypto";

import { demoKeys, publicJwk, publicPem, serverKeyList, signJwt, signWithKey, verifyJwt } from "./jws";
import { AUDIENCE, ISSUER, NAIVE, STRICT, type AttackId, type AttackResult, type IssueInput, type VerifyChecks, type VerifyResult } from "./jwt.schema";

// The anatomy and attack demos: issue a token with the learner's claims,
// verify any token strictly, and forge each attack for real, then run it
// through the naive and the (configurable) strict verifier.

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function issueToken({ alg, sub, role, ttl }: IssueInput): string {
  const keys = demoKeys();
  const key = alg === "HS256" ? keys.hs : alg === "RS256" ? keys.rs : keys.es;
  const iat = nowSeconds();
  return signWithKey(key, { iss: ISSUER, sub, aud: AUDIENCE, role, iat, exp: iat + ttl, jti: randomBytes(8).toString("hex") });
}

export function verifyToken(token: string, checks: VerifyChecks = STRICT): VerifyResult {
  return verifyJwt(token, { keys: serverKeyList(), checks, issuer: ISSUER, audience: AUDIENCE });
}

function forge(attack: AttackId): string {
  const { rs, attacker } = demoKeys();
  const iat = nowSeconds();
  const admin = { iss: ISSUER, sub: "mallory", aud: AUDIENCE, role: "admin", iat, exp: iat + 600, jti: randomBytes(8).toString("hex") };
  const victim = { ...admin, sub: "alice", role: "reader" };
  switch (attack) {
    case "alg-none":
      return signJwt({ alg: "none", typ: "JWT", kid: rs.kid }, admin, {});
    case "key-confusion":
      // HMAC keyed with the RSA public key's PEM text, which anyone can download.
      return signJwt({ alg: "HS256", typ: "JWT", kid: rs.kid }, admin, { secret: publicPem(rs) });
    case "embedded-jwk":
      return signJwt({ alg: "ES256", typ: "JWT", kid: attacker.kid, jwk: publicJwk(attacker) }, admin, attacker);
    case "expired":
      // A real token, stolen from a log an hour after it expired.
      return signWithKey(rs, { ...victim, iat: iat - 7200, exp: iat - 3600 });
    case "wrong-audience":
      // A real token the same issuer gave the billing app, replayed at this API.
      return signWithKey(rs, { ...victim, aud: "billing-api" });
    case "wrong-issuer":
      // Signed by a key this API trusts, but for another tenant of a shared identity provider.
      return signWithKey(rs, { ...victim, iss: "https://auth.handbook.example/tenants/other", role: "admin" });
  }
}

export function runAttack(attack: AttackId, checks: VerifyChecks): AttackResult {
  const token = forge(attack);
  return { token, naive: verifyToken(token, NAIVE), strict: verifyToken(token, checks), publicKeyPem: publicPem(demoKeys().rs) };
}

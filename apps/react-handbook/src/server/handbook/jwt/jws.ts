import "server-only";

import {
  createHmac,
  createPublicKey,
  generateKeyPairSync,
  randomBytes,
  sign,
  timingSafeEqual,
  verify,
  type JsonWebKey,
  type KeyObject,
} from "node:crypto";

import { base64UrlDecode, base64UrlEncode, decodeToken } from "./jwt-format";
import type { Alg, CheckId, CheckResult, PublicJwk, VerifyChecks, VerifyResult } from "./jwt.schema";

// A hand-built JWS (RFC 7515/7518) on node:crypto: signing and one verifier
// whose checks can be switched off one by one, so the attack demo can show
// which check stops which attack. Naive = every check off.

export type ServerKey = {
  kid: string;
  alg: Alg;
  /** HS256 only. Never leaves this module. */
  secret?: Buffer;
  privateKey?: KeyObject;
  publicKey?: KeyObject;
};

/** Key material a token can be signed with: a server key, or a forger's own. */
type SigningMaterial = { secret?: Buffer | string; privateKey?: KeyObject };

export function createKey(alg: Alg, kid: string): ServerKey {
  if (alg === "HS256") return { kid, alg, secret: randomBytes(32) };
  const pair =
    alg === "RS256" ? generateKeyPairSync("rsa", { modulusLength: 2048 }) : generateKeyPairSync("ec", { namedCurve: "P-256" });
  return { kid, alg, privateKey: pair.privateKey, publicKey: pair.publicKey };
}

/** The public members only (no d, p, q…), as a key set publishes them. */
export function publicJwk(key: ServerKey): PublicJwk | null {
  if (!key.publicKey) return null;
  const jwk = key.publicKey.export({ format: "jwk" }) as Record<string, string>;
  const { kty, n, e, crv, x, y } = jwk;
  return Object.fromEntries(
    Object.entries({ kty, n, e, crv, x, y, kid: key.kid, alg: key.alg, use: "sig" }).filter(([, v]) => v !== undefined),
  ) as PublicJwk;
}

export function publicPem(key: ServerKey): string {
  return key.publicKey ? (key.publicKey.export({ type: "spki", format: "pem" }) as string) : "";
}

// Demo keys, created on first use (never at import: `next build` imports
// route modules). The boot id in each kid makes tokens from before a restart
// fail with "unknown key id" instead of an error.
type DemoKeys = { bootId: string; hs: ServerKey; rs: ServerKey; es: ServerKey; attacker: ServerKey };
const g = globalThis as { __jwtDemoKeys?: DemoKeys };

export function demoKeys(): DemoKeys {
  if (!g.__jwtDemoKeys) {
    const bootId = randomBytes(3).toString("hex");
    g.__jwtDemoKeys = {
      bootId,
      hs: createKey("HS256", `hs-${bootId}`),
      rs: createKey("RS256", `rs-${bootId}`),
      es: createKey("ES256", `es-${bootId}`),
      attacker: createKey("ES256", "attacker-key"),
    };
  }
  return g.__jwtDemoKeys;
}

export function serverKeyList(): ServerKey[] {
  const { hs, rs, es } = demoKeys();
  return [hs, rs, es];
}

function signBytes(alg: Alg, material: SigningMaterial, data: Buffer): Buffer {
  if (alg === "HS256") return createHmac("sha256", material.secret!).update(data).digest();
  if (alg === "RS256") return sign("sha256", data, material.privateKey!);
  // JWS wants ECDSA as raw r‖s (64 bytes for P-256), not DER. The key must be
  // passed as a PEM string here, not a KeyObject: the Cloudflare Workers
  // runtime rejects a KeyObject inside the options object alongside dsaEncoding.
  const pem = material.privateKey!.export({ type: "pkcs8", format: "pem" }) as string;
  return sign("sha256", data, { key: pem, dsaEncoding: "ieee-p1363" });
}

/** Signs header + payload as given; `alg: "none"` yields an empty signature. */
export function signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, material: SigningMaterial): string {
  const input = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  if (header.alg === "none") return `${input}.`;
  return `${input}.${base64UrlEncode(signBytes(header.alg as Alg, material, Buffer.from(input, "ascii")))}`;
}

export function signWithKey(key: ServerKey, payload: Record<string, unknown>, extraHeader: Record<string, unknown> = {}): string {
  return signJwt({ alg: key.alg, typ: "JWT", kid: key.kid, ...extraHeader }, payload, key);
}

function verifyBytes(alg: Alg, key: { secret?: Buffer | string; publicKey?: KeyObject }, data: Buffer, signature: Uint8Array): boolean {
  if (alg === "HS256") {
    if (key.secret === undefined) return false;
    const expected = createHmac("sha256", key.secret).update(data).digest();
    return expected.length === signature.length && timingSafeEqual(expected, signature);
  }
  if (!key.publicKey) return false;
  try {
    if (alg === "RS256") return verify("sha256", data, key.publicKey, signature);
    // PEM string, not a KeyObject, for the same Workers-runtime reason as signing.
    const pem = key.publicKey.export({ type: "spki", format: "pem" }) as string;
    return verify("sha256", data, { key: pem, dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false; // wrong key type for the algorithm, malformed signature…
  }
}

export type VerifyOptions = {
  keys: ServerKey[];
  checks: VerifyChecks;
  issuer: string;
  audience: string;
  /** Seconds of clock skew allowed on exp and nbf. */
  leeway?: number;
  now?: number;
};

const SUPPORTED = new Set<string>(["HS256", "RS256", "ES256"]);

export function verifyJwt(token: string, options: VerifyOptions): VerifyResult {
  const { checks, issuer, audience, leeway = 0 } = options;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const results: CheckResult[] = [];
  const decoded = decodeToken(token);
  const header = decoded.header;
  const payload = decoded.payload;

  const add = (id: CheckId, status: CheckResult["status"], detail: string) => results.push({ id, status, detail });
  const finish = (): VerifyResult => {
    const failed = results.find((r) => r.status === "fail");
    return { valid: !failed, checks: results, failedAt: failed?.id ?? null, header, payload };
  };
  const skipRest = (from: CheckId[], why: string) => from.forEach((id) => add(id, "skipped", why));

  if (decoded.errors.length > 0 || !header || !payload) {
    add("format", "fail", decoded.errors[0]?.message ?? "Not a token.");
    skipRest(["alg", "key", "signature", "exp", "nbf", "iss", "aud"], "Not reached: the token couldn't be read.");
    return finish();
  }
  add("format", "pass", "Three base64url parts; header and payload are JSON objects.");

  // Key: from the server's own key set by kid, or (naive) whatever the token brings.
  const alg = typeof header.alg === "string" ? header.alg : "";
  const kid = typeof header.kid === "string" ? header.kid : null;
  const serverKey = kid ? options.keys.find((k) => k.kid === kid) : undefined;
  let key: { secret?: Buffer | string; publicKey?: KeyObject; alg?: Alg } | undefined;
  let keyDetail: string;
  const embedded = header.jwk && typeof header.jwk === "object" ? (header.jwk as JsonWebKey) : null;

  if (embedded && !checks.serverKeys) {
    try {
      key = { publicKey: createPublicKey({ key: embedded, format: "jwk" }) };
      keyDetail = "Used the public key inside the token's own header.";
    } catch {
      keyDetail = "The key inside the header couldn't be read.";
    }
  } else if (serverKey) {
    // An HMAC check against an RSA/EC key: the naive verifier uses the
    // public key's PEM text as the secret, as the historic library bug did.
    key = { ...serverKey, secret: serverKey.secret ?? publicPem(serverKey) };
    keyDetail = `Server key ${serverKey.kid} (${serverKey.alg})${embedded ? "; the key inside the header was ignored" : ""}.`;
  } else {
    keyDetail = kid ? `Unknown key id "${kid}": not in the server's key set${embedded ? " (the key inside the header was ignored)" : ""}.` : "No kid: the verifier can't tell which key to use.";
  }

  // Algorithm: pinned to the key, or (naive) taken from the token.
  let algOk = true;
  if (alg === "none") {
    if (checks.pinAlg) {
      add("alg", "fail", 'alg "none" means unsigned; never accept it.');
      algOk = false;
    } else add("alg", "skipped", 'Not pinned: took alg "none" from the token, so there is no signature to check.');
  } else if (!SUPPORTED.has(alg)) {
    add("alg", "fail", `Unsupported algorithm "${alg || "missing"}".`);
    algOk = false;
  } else if (checks.pinAlg) {
    const expected = serverKey?.alg;
    if (expected && expected !== alg) {
      add("alg", "fail", `The token says ${alg}, but key ${serverKey!.kid} is registered for ${expected} only.`);
      algOk = false;
    } else add("alg", "pass", expected ? `${alg}, the algorithm registered for this key.` : `${alg} (no server key to pin it to).`);
  } else add("alg", "skipped", `Not pinned: used ${alg} because the token said so.`);

  if (!key && alg !== "none") {
    add("key", "fail", keyDetail);
  } else add("key", alg === "none" && !key ? "skipped" : "pass", alg === "none" && !key ? "No key needed for alg none." : keyDetail);

  const keyOk = results.at(-1)!.status !== "fail";
  if (!algOk || !keyOk) {
    skipRest(["signature", "exp", "nbf", "iss", "aud"], "Not reached: the verifier stopped earlier.");
    return finish();
  }

  if (alg === "none") {
    add("signature", "skipped", "No signature: anyone could have written this token.");
  } else {
    const signature = base64UrlDecode(decoded.parts[2])!;
    const input = Buffer.from(`${decoded.parts[0]}.${decoded.parts[1]}`, "ascii");
    if (verifyBytes(alg as Alg, key!, input, signature)) add("signature", "pass", `Valid ${alg} signature over header and payload.`);
    else {
      add("signature", "fail", "The signature doesn't match the header and payload: the token was changed or signed with another key.");
      skipRest(["exp", "nbf", "iss", "aud"], "Not reached: claims of a token with a bad signature can't be trusted.");
      return finish();
    }
  }

  // Claims.
  if (!checks.exp) {
    add("exp", "skipped", "Not checked.");
    add("nbf", "skipped", "Not checked.");
  } else {
    const exp = payload.exp;
    if (typeof exp !== "number") add("exp", "fail", "No exp: the token would never expire.");
    else if (now > exp + leeway) add("exp", "fail", `Expired ${now - exp} s ago${leeway ? ` (leeway ${leeway} s)` : ""}.`);
    else add("exp", "pass", now > exp ? `Expired ${now - exp} s ago, but within the ${leeway} s leeway.` : `Valid for ${exp - now} more s.`);
    const nbf = payload.nbf;
    if (nbf === undefined) add("nbf", "pass", "No nbf.");
    else if (typeof nbf !== "number" || now < nbf - leeway) add("nbf", "fail", "Not valid yet (nbf is in the future).");
    else add("nbf", "pass", "Already valid (nbf has passed).");
  }

  if (!checks.iss) add("iss", "skipped", "Not checked.");
  else if (payload.iss === issuer) add("iss", "pass", `Issued by ${issuer}.`);
  else add("iss", "fail", `Issued by ${JSON.stringify(payload.iss ?? null)}, not ${issuer}.`);

  if (!checks.aud) add("aud", "skipped", "Not checked.");
  else {
    const aud = payload.aud;
    const list = Array.isArray(aud) ? aud : [aud];
    if (list.includes(audience)) add("aud", "pass", `Meant for ${audience}.`);
    else add("aud", "fail", `Meant for ${JSON.stringify(aud ?? null)}, not ${audience}.`);
  }

  return finish();
}

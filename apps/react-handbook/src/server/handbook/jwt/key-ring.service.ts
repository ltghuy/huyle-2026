import "server-only";

import { randomBytes } from "node:crypto";

import { createKey, publicJwk, signWithKey, verifyJwt, type ServerKey } from "./jws";
import { AUDIENCE, ISSUER, STRICT, type PublicJwk, type RingView, type VerifyResult } from "./jwt.schema";

// The rotation demo's issuer: a key ring per run (browser tab), so one
// visitor's rotation never breaks another's. Keys go published → signing →
// published → retired; the JWKS lists every key that isn't retired, and
// verification picks the key by kid from that list.

type RingEntry = { kid: string; status: "signing" | "published" | "retired"; createdAt: number; key: ServerKey };
type Ring = { next: number; keys: RingEntry[] };

export type RingResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

const MAX_RUNS = 200;
const MAX_KEYS = 8;
const g = globalThis as { __jwtKeyRings?: Map<string, Ring> };
const rings = (g.__jwtKeyRings ??= new Map());

function addKey(ring: Ring, status: RingEntry["status"]) {
  const kid = `key-${ring.next++}-${randomBytes(2).toString("hex")}`;
  ring.keys.push({ kid, status, createdAt: Date.now(), key: createKey("ES256", kid) });
}

function ringFor(run: string): Ring {
  let ring = rings.get(run);
  if (!ring) {
    ring = { next: 1, keys: [] };
    addKey(ring, "signing");
    rings.set(run, ring);
    if (rings.size > MAX_RUNS) rings.delete(rings.keys().next().value!);
  }
  return ring;
}

function view(ring: Ring): RingView {
  return {
    keys: ring.keys.map(({ kid, status, createdAt }) => ({ kid, status, createdAt })),
    jwks: { keys: ring.keys.filter((k) => k.status !== "retired").map((k) => publicJwk(k.key) as PublicJwk) },
  };
}

export function getRing(run: string): RingView {
  return view(ringFor(run));
}

export function addRingKey(run: string): RingResult<RingView> {
  const ring = ringFor(run);
  if (ring.keys.length >= MAX_KEYS) return { ok: false, status: 409, message: `This demo keeps at most ${MAX_KEYS} keys.` };
  addKey(ring, "published");
  return { ok: true, data: view(ring) };
}

export function promoteRingKey(run: string, kid: string): RingResult<RingView> {
  const ring = ringFor(run);
  const entry = ring.keys.find((k) => k.kid === kid);
  if (!entry || entry.status !== "published") return { ok: false, status: 409, message: "Only a published key can become the signing key." };
  for (const k of ring.keys) if (k.status === "signing") k.status = "published";
  entry.status = "signing";
  return { ok: true, data: view(ring) };
}

export function retireRingKey(run: string, kid: string): RingResult<RingView> {
  const ring = ringFor(run);
  const entry = ring.keys.find((k) => k.kid === kid);
  if (!entry || entry.status !== "published") return { ok: false, status: 409, message: "Only a published key that isn't signing can be retired." };
  entry.status = "retired";
  return { ok: true, data: view(ring) };
}

export function signWithRing(run: string): { token: string; kid: string } {
  const ring = ringFor(run);
  const signing = ring.keys.find((k) => k.status === "signing")!;
  const iat = Math.floor(Date.now() / 1000);
  return { token: signWithKey(signing.key, { iss: ISSUER, sub: "alice", aud: AUDIENCE, iat, exp: iat + 3600 }), kid: signing.kid };
}

export function verifyWithRing(run: string, token: string): VerifyResult {
  const keys = ringFor(run).keys.filter((k) => k.status !== "retired").map((k) => k.key);
  return verifyJwt(token, { keys, checks: STRICT, issuer: ISSUER, audience: AUDIENCE });
}

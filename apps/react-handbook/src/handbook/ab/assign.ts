// The live experiment on the A/B testing page. Pure functions, so the server
// (first render) and the browser (what-ifs) assign exactly the same way.

export const EXPERIMENT = "buy-button-2026-10";
export const ID_COOKIE = "rp-ab-id";
/** Pins a variant, the way QA and end-to-end tests see a chosen one. */
export const FORCE_COOKIE = "rp-ab-force";
export const BUCKETS = 10_000;
/** The live split: share of visitors, in percent, who get variant A. */
export const LIVE_SPLIT = 50;

export type Variant = "A" | "B";

export const VARIANT_LABEL: Record<Variant, string> = { A: "Add to cart", B: "Buy now" };

/** FNV-1a, 32-bit: a small, fast, well-spread hash that gives the same answer everywhere. */
export function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function bucketFor(id: string, experiment = EXPERIMENT) {
  return fnv1a(`${experiment}:${id}`) % BUCKETS;
}

/** Buckets below the split are A; the rest are B. */
export function variantFor(bucket: number, splitPercent = LIVE_SPLIT): Variant {
  return bucket < splitPercent * (BUCKETS / 100) ? "A" : "B";
}

export function isVariant(value: string | undefined): value is Variant {
  return value === "A" || value === "B";
}

/** Ids are random and say nothing about the visitor. */
export function newVisitorId() {
  return crypto.randomUUID();
}

export function isVisitorId(value: string | undefined): value is string {
  return !!value && /^[0-9a-f-]{36}$/i.test(value);
}

// The saved cart. Anything read from storage is untrusted (an older version
// of the app, another tab, a user editing devtools), so it is parsed with
// Zod, migrated to the current version, and only then used.

import { z } from "zod";

import { DISCOUNT_CODES, MAX_LINES } from "@/server/practices/context-reducer/shop.schema";

import { EMPTY_CART, type Cart } from "./cart";

export const STORAGE_KEY = "rp.context-reducer.cart";

const qty = z.number().int().min(1).max(99);
const productId = z.string().min(1).max(10);

/** The first release: a map of quantities and an optional coupon. */
const v1Schema = z.object({
  items: z.record(productId, qty),
  coupon: z.string().optional(),
});

const v2Schema = z.object({
  version: z.literal(2),
  lines: z.array(z.object({ productId, qty })).max(MAX_LINES),
  discount: z.enum(DISCOUNT_CODES).nullable(),
});

type SavedV2 = z.infer<typeof v2Schema>;

export type LoadResult = { cart: Cart; notes: string[] } | null;

function fromV1(saved: z.infer<typeof v1Schema>): { cart: Cart; notes: string[] } {
  const coupon = saved.coupon?.trim().toUpperCase();
  const known = (DISCOUNT_CODES as readonly string[]).includes(coupon ?? "");
  const notes = ["Your saved cart was from an older version and has been updated."];
  if (coupon && !known) notes.push(`The old coupon “${saved.coupon}” no longer exists.`);
  return {
    cart: {
      lines: Object.entries(saved.items).slice(0, MAX_LINES).map(([id, n]) => ({ productId: id, qty: n })),
      discount: known ? (coupon as Cart["discount"]) : null,
    },
    notes,
  };
}

/** Parses any saved value; null when there was nothing saved. */
export function parseSaved(raw: string | null): LoadResult {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { cart: EMPTY_CART, notes: ["Your saved cart couldn't be read and was reset."] };
  }
  const v2 = v2Schema.safeParse(json);
  if (v2.success) return { cart: { lines: v2.data.lines, discount: v2.data.discount }, notes: [] };
  const v1 = v1Schema.safeParse(json);
  if (v1.success) return fromV1(v1.data);
  const version = (json as { version?: unknown } | null)?.version;
  return {
    cart: EMPTY_CART,
    notes: [
      typeof version === "number" && version > 2
        ? "Your saved cart is from a newer version and couldn't be used."
        : "Your saved cart couldn't be read and was reset.",
    ],
  };
}

export function serialize(cart: Cart) {
  const saved: SavedV2 = { version: 2, lines: cart.lines.map((l) => ({ ...l })), discount: cart.discount };
  return JSON.stringify(saved);
}

export function readSaved(): LoadResult {
  try {
    return parseSaved(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // storage blocked: start empty
  }
}

/** False when the browser refuses to store (private mode, quota). */
export function writeSaved(value: string): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== value) localStorage.setItem(STORAGE_KEY, value);
    return true;
  } catch {
    return false;
  }
}

/** Demo helpers: write an old-format or broken save. */
export const SAMPLE_V1 = JSON.stringify({ items: { p01: 2, p07: 1, p09: 9, p99: 1 }, coupon: "save10" });
export const SAMPLE_CORRUPT = '{"version":2,"lines":[{"productId":"p01","qty":"lots"}';

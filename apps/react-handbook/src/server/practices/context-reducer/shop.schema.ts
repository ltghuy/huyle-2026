// Shared by the shop's client and server (no `server-only`): product type,
// discount rules and pricing, so client totals and the server's re-check
// can never disagree. All amounts are integer cents.

import { z } from "zod";

export const COLORS = ["blue", "green", "amber", "rose", "violet", "slate", "teal", "orange"] as const;

export type Product = {
  id: string;
  name: string;
  /** Cents. */
  price: number;
  stock: number;
  color: (typeof COLORS)[number];
};

export const DISCOUNT_CODES = ["SAVE10", "BULK15", "FREESHIP"] as const;
export type DiscountCode = (typeof DISCOUNT_CODES)[number];

export const SHIPPING = 500;
export const FREE_SHIPPING_FROM = 5000;
export const BULK_MIN_ITEMS = 5;
export const MAX_LINES = 50;

export const DISCOUNT_LABELS: Record<DiscountCode, string> = {
  SAVE10: "10% off",
  BULK15: `15% off ${BULK_MIN_ITEMS}+ items`,
  FREESHIP: "Free shipping",
};

export type DiscountCheck = { ok: true; code: DiscountCode } | { ok: false; reason: string };

/** Case-insensitive; BULK15 needs enough items. */
export function checkDiscount(input: string, itemCount: number): DiscountCheck {
  const code = input.trim().toUpperCase();
  if (!(DISCOUNT_CODES as readonly string[]).includes(code)) {
    return { ok: false, reason: `“${input.trim()}” isn't a valid code.` };
  }
  if (code === "BULK15" && itemCount < BULK_MIN_ITEMS) {
    return { ok: false, reason: `BULK15 needs at least ${BULK_MIN_ITEMS} items.` };
  }
  return { ok: true, code: code as DiscountCode };
}

export type PricedLine = { qty: number; price: number };

export type CartTotals = {
  items: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

export function priceCart(lines: PricedLine[], code: DiscountCode | null): CartTotals {
  let items = 0;
  let subtotal = 0;
  for (const line of lines) {
    items += line.qty;
    subtotal += line.qty * line.price;
  }
  const rate = code === "SAVE10" ? 0.1 : code === "BULK15" && items >= BULK_MIN_ITEMS ? 0.15 : 0;
  const discount = Math.round(subtotal * rate);
  const discounted = subtotal - discount;
  const freeShipping = items === 0 || code === "FREESHIP" || discounted >= FREE_SHIPPING_FROM;
  const shipping = freeShipping ? 0 : SHIPPING;
  return { items, subtotal, discount, shipping, total: discounted + shipping };
}

// -- API ------------------------------------------------------------------------

export const productsQuerySchema = z.object({
  latencyMs: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const checkoutQuerySchema = z.object({
  latencyMs: z.coerce.number().int().min(0).max(10_000).default(0),
  fail: z.enum(["none", "network", "conflict"]).default("none"),
});

export const checkoutBodySchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1).max(10),
        qty: z.number().int().min(1).max(99),
        unitPrice: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  discount: z.enum(DISCOUNT_CODES).nullable(),
  expectedTotal: z.number().int().min(0),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type CheckoutFail = z.infer<typeof checkoutQuerySchema>["fail"];

export type Order = { orderId: string; total: number; placedAt: string };

export type Adjustment = { productId: string; kind: "stock" | "price"; value: number };

export const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number) {
  return MONEY.format(cents / 100);
}

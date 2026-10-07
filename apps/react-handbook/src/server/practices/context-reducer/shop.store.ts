import "server-only";

import {
  COLORS,
  priceCart,
  type Adjustment,
  type CheckoutBody,
  type CheckoutFail,
  type Order,
  type Product,
} from "./shop.schema";

const ITEMS = ["mug", "notebook", "tote bag", "water bottle", "desk lamp", "sticker pack"];
const PRICES = [1200, 850, 1900, 2400, 4500, 400];

// 12 products: few enough to see every card at once.
const products: Product[] = Array.from({ length: 12 }, (_, i) => {
  const color = COLORS[i % 4];
  const item = ITEMS[Math.floor(i / 4) % ITEMS.length];
  return {
    id: `p${String(i + 1).padStart(2, "0")}`,
    name: `${color[0].toUpperCase()}${color.slice(1)} ${item}`,
    price: PRICES[Math.floor(i / 4) % PRICES.length] + (i % 4) * 100,
    // A few nearly-sold-out products make the stock limit easy to hit.
    stock: [1, 2, 3, 5, 8, 12][i % 6],
    color,
  };
});
const byId = new Map(products.map((p) => [p.id, p]));

// Order numbers survive dev HMR and are shared by every route module.
const holder = globalThis as typeof globalThis & { __shopOrders?: { next: number } };
const orders = (holder.__shopOrders ??= { next: 1001 });

export function listProducts(): Product[] {
  return products;
}

export async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type CheckoutResult =
  | { ok: true; order: Order }
  | { ok: false; status: 409; message: string; adjustments: Adjustment[] }
  | { ok: false; status: 500; message: string };

/** Re-checks every line against the catalog; `fail` injects demo failures. */
export function checkout(body: CheckoutBody, fail: CheckoutFail): CheckoutResult {
  if (fail === "network") return { ok: false, status: 500, message: "Payment service unavailable. Try again." };

  const adjustments: Adjustment[] = [];
  for (const line of body.lines) {
    const product = byId.get(line.productId);
    if (!product) adjustments.push({ productId: line.productId, kind: "stock", value: 0 });
    else if (line.qty > product.stock) adjustments.push({ productId: line.productId, kind: "stock", value: product.stock });
    else if (line.unitPrice !== product.price) adjustments.push({ productId: line.productId, kind: "price", value: product.price });
  }
  // Demo conflict: someone else just bought one of the first line's product.
  if (fail === "conflict" && adjustments.length === 0) {
    const first = body.lines[0];
    adjustments.push({ productId: first.productId, kind: "stock", value: first.qty - 1 });
  }
  if (adjustments.length > 0) {
    return { ok: false, status: 409, message: "Some items changed while you were shopping.", adjustments };
  }

  const totals = priceCart(body.lines.map((l) => ({ qty: l.qty, price: l.unitPrice })), body.discount);
  if (totals.total !== body.expectedTotal) {
    return { ok: false, status: 409, message: "The total changed. Please review your cart.", adjustments: [] };
  }
  return {
    ok: true,
    order: { orderId: `A-${orders.next++}`, total: totals.total, placedAt: new Date().toISOString() },
  };
}

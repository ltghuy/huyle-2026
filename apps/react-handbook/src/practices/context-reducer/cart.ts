// Pure cart operations. Every function returns the same object when nothing
// changes, so the reducer can tell "no change" apart with `===`.

import {
  BULK_MIN_ITEMS,
  checkDiscount,
  type Adjustment,
  type DiscountCode,
  type Product,
} from "@/server/practices/context-reducer/shop.schema";

export type Line = { readonly productId: string; readonly qty: number };
export type Cart = { readonly lines: readonly Line[]; readonly discount: DiscountCode | null };

export const EMPTY_CART: Cart = { lines: [], discount: null };

/** One thing an action changed, formatted with product names by the log. */
export type Change =
  | { kind: "added"; productId: string; qty: number }
  | { kind: "removed"; productId: string }
  | { kind: "qty"; productId: string; from: number; to: number }
  | { kind: "discount"; from: DiscountCode | null; to: DiscountCode | null };

export function itemCount(cart: Cart) {
  let count = 0;
  for (const line of cart.lines) count += line.qty;
  return count;
}

export function qtyOf(cart: Cart, productId: string) {
  return cart.lines.find((l) => l.productId === productId)?.qty ?? 0;
}

function withLines(cart: Cart, lines: Line[]): Cart {
  return { ...cart, lines };
}

export function addItem(cart: Cart, productId: string, stock: number): Cart {
  const index = cart.lines.findIndex((l) => l.productId === productId);
  if (index === -1) return stock < 1 ? cart : withLines(cart, [...cart.lines, { productId, qty: 1 }]);
  const line = cart.lines[index];
  if (line.qty >= stock) return cart;
  return withLines(cart, cart.lines.with(index, { productId, qty: line.qty + 1 }));
}

export function setQty(cart: Cart, productId: string, qty: number, stock: number): Cart {
  const index = cart.lines.findIndex((l) => l.productId === productId);
  if (index === -1 || !Number.isFinite(qty)) return cart;
  const next = Math.min(Math.max(Math.trunc(qty), 1), Math.max(stock, 1));
  if (next === cart.lines[index].qty) return cart;
  return withLines(cart, cart.lines.with(index, { productId, qty: next }));
}

export function removeItem(cart: Cart, productId: string): Cart {
  const lines = cart.lines.filter((l) => l.productId !== productId);
  return lines.length === cart.lines.length ? cart : withLines(cart, lines);
}

export function clearCart(cart: Cart): Cart {
  return cart.lines.length === 0 && cart.discount === null ? cart : EMPTY_CART;
}

export function setDiscount(cart: Cart, discount: DiscountCode | null): Cart {
  return cart.discount === discount ? cart : { ...cart, discount };
}

/** Drops a discount that is no longer eligible, with the reason. */
export function enforceDiscount(cart: Cart): { cart: Cart; notice: string | null } {
  if (cart.discount === "BULK15" && itemCount(cart) < BULK_MIN_ITEMS) {
    return {
      cart: { ...cart, discount: null },
      notice: `BULK15 was removed: it needs at least ${BULK_MIN_ITEMS} items.`,
    };
  }
  return { cart, notice: null };
}

/** What changed between two carts, in line order. */
export function diffCarts(prev: Cart, next: Cart): Change[] {
  if (prev === next) return [];
  const changes: Change[] = [];
  const before = new Map(prev.lines.map((l) => [l.productId, l.qty]));
  const after = new Map(next.lines.map((l) => [l.productId, l.qty]));
  for (const line of prev.lines) {
    if (!after.has(line.productId)) changes.push({ kind: "removed", productId: line.productId });
  }
  for (const line of next.lines) {
    const old = before.get(line.productId);
    if (old === undefined) changes.push({ kind: "added", productId: line.productId, qty: line.qty });
    else if (old !== line.qty) changes.push({ kind: "qty", productId: line.productId, from: old, to: line.qty });
  }
  if (prev.discount !== next.discount) changes.push({ kind: "discount", from: prev.discount, to: next.discount });
  return changes;
}

export function cartsEqual(a: Cart, b: Cart) {
  return a === b || diffCarts(a, b).length === 0;
}

/**
 * Makes a saved or synced cart valid for the current catalog: unknown
 * products dropped, quantities clamped to stock, discount re-checked.
 */
export function reconcile(cart: Cart, products: ReadonlyMap<string, Product>): { cart: Cart; notes: string[] } {
  const notes: string[] = [];
  const lines: Line[] = [];
  for (const line of cart.lines) {
    const product = products.get(line.productId);
    if (!product || product.stock < 1) {
      notes.push(`A product that's no longer available was removed.`);
      continue;
    }
    if (line.qty > product.stock) {
      notes.push(`${product.name}: only ${product.stock} left, quantity reduced.`);
      lines.push({ productId: line.productId, qty: product.stock });
    } else lines.push(line);
  }
  let discount = cart.discount;
  if (discount) {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const check = checkDiscount(discount, count);
    if (!check.ok) {
      notes.push(`Discount ${discount} was removed: ${check.reason}`);
      discount = null;
    }
  }
  return { cart: { lines, discount }, notes };
}

/** Applies the server's corrections after a checkout conflict. */
export function applyAdjustments(cart: Cart, adjustments: Adjustment[]): Cart {
  let next = cart;
  for (const a of adjustments) {
    if (a.kind !== "stock") continue;
    next = a.value < 1 ? removeItem(next, a.productId) : setQty(next, a.productId, a.value, a.value);
  }
  return enforceDiscount(next).cart;
}

import type {
  Adjustment,
  CheckoutBody,
  CheckoutFail,
  Order,
  Product,
} from "@/server/practices/context-reducer/shop.schema";
import { HttpError, type QueryKey } from "@/practices/data-fetching-hook/query-client";

const BASE = "/api/practices/context-reducer";

/** Read at request time, so demo controls apply to the next request. */
export const network = {
  catalogLatencyMs: 400,
  checkoutLatencyMs: 1200,
  checkoutFail: "none" as CheckoutFail,
};

export const productsKey: QueryKey = ["context-reducer", "products"];

export async function fetchProducts({ signal }: { signal: AbortSignal }): Promise<Product[]> {
  const res = await fetch(`${BASE}/products?latencyMs=${network.catalogLatencyMs}`, { signal });
  const json = await res.json();
  if (!res.ok) throw new HttpError(res.status, json.error?.message ?? `HTTP ${res.status}`);
  return json.data;
}

/** The server changed some lines: the cart must be corrected and reviewed. */
export class CheckoutConflict extends Error {
  constructor(message: string, readonly adjustments: Adjustment[]) {
    super(message);
  }
}

export async function postCheckout(body: CheckoutBody): Promise<Order> {
  const params = new URLSearchParams({ latencyMs: String(network.checkoutLatencyMs), fail: network.checkoutFail });
  let res: Response;
  try {
    res = await fetch(`${BASE}/checkout?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("You seem to be offline. Your cart is safe; try again.");
  }
  const json = await res.json();
  if (res.status === 409) throw new CheckoutConflict(json.error.message, json.error.issues?.adjustments ?? []);
  if (!res.ok) throw new Error(json.error?.message ?? `Checkout failed (HTTP ${res.status}).`);
  return json.data;
}

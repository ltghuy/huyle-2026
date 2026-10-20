import { TEAM_PIECES, type PieceId } from "./store";

// Who owns which URL, and the one event the store's pieces agree on.

export type RouteMatch =
  | { found: true; path: string; owner: PieceId; prefix: string; subpath: string }
  | { found: false; path: string };

/** Longest prefixes first, so /products/42 isn't claimed by "/". */
const PREFIXES = TEAM_PIECES.flatMap((p) => p.owns.map((prefix) => ({ prefix, owner: p.id }))).sort((a, b) => b.prefix.length - a.prefix.length);

export function normalisePath(input: string): string {
  let path = input.trim().split(/[?#]/)[0] ?? "";
  path = path.replace(/^https?:\/\/[^/]+/i, "");
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path.toLowerCase();
}

export function matchRoute(input: string): RouteMatch {
  const path = normalisePath(input);
  for (const { prefix, owner } of PREFIXES) {
    // "/" owns only the home page; other prefixes own everything under them.
    const hit = prefix === "/" ? path === "/" : path === prefix || path.startsWith(`${prefix}/`);
    if (hit) return { found: true, path, owner, prefix, subpath: prefix === "/" ? "/" : path.slice(prefix.length) || "/" };
  }
  return { found: false, path };
}

export const SAMPLE_PATHS = ["/", "/products/espresso-grinder", "/search?q=kettle", "/cart", "/checkout/payment", "/account/orders/1042", "/gift-cards"] as const;

// The cart event. Version 1 is what every listener was written against.

export type FieldType = "string" | "number";
export type Contract = Record<string, FieldType>;
export type Payload = Record<string, string | number>;

export const CONTRACT_V1: Contract = { sku: "string", quantity: "number", price: "number" };
export const EVENT_NAME = "cart:item-added";

export type ChangeId = "none" | "add" | "rename" | "remove" | "type";

export const CHANGES: readonly { id: ChangeId; label: string; contract: Contract; payload: Payload }[] = [
  { id: "none", label: "No change", contract: CONTRACT_V1, payload: { sku: "GRN-200", quantity: 1, price: 89 } },
  {
    id: "add",
    label: "Add a currency field",
    contract: { ...CONTRACT_V1, currency: "string" },
    payload: { sku: "GRN-200", quantity: 1, price: 89, currency: "EUR" },
  },
  { id: "rename", label: "Rename quantity to qty", contract: { sku: "string", qty: "number", price: "number" }, payload: { sku: "GRN-200", qty: 1, price: 89 } },
  { id: "remove", label: "Remove price", contract: { sku: "string", quantity: "number" }, payload: { sku: "GRN-200", quantity: 1 } },
  {
    id: "type",
    label: "Send price as a string",
    contract: { sku: "string", quantity: "number", price: "string" },
    payload: { sku: "GRN-200", quantity: 1, price: "89.00" },
  },
];

export type Listener = { id: string; owner: PieceId; name: string; reads: readonly string[] };

export const LISTENERS: readonly Listener[] = [
  { id: "badge", owner: "shell", name: "Header cart count", reads: ["quantity"] },
  { id: "mini-cart", owner: "checkout", name: "Mini cart total", reads: ["sku", "quantity", "price"] },
];

export type Delivery = { listener: Listener; works: boolean; shown: string; reason: string };

/** A change is compatible when every v1 field is still there with the same type. */
export function isCompatible(contract: Contract): boolean {
  return Object.entries(CONTRACT_V1).every(([field, type]) => contract[field] === type);
}

/** Deliver the payload to listeners written against v1, the way plain code would read it. */
export function deliver(payload: Payload, count: number, total: number): Delivery[] {
  return LISTENERS.map((listener) => {
    const missing = listener.reads.filter((f) => !(f in payload));
    const wrongType = listener.reads.filter((f) => f in payload && typeof payload[f] !== CONTRACT_V1[f]);
    const quantity = payload.quantity as number;
    if (listener.id === "badge") {
      if (missing.length > 0) return { listener, works: false, shown: `${count} + undefined = NaN`, reason: `reads "quantity", which is no longer sent` };
      return { listener, works: true, shown: `${count + quantity} items`, reason: "reads only quantity" };
    }
    if (missing.length > 0) {
      return { listener, works: false, shown: "NaN", reason: `reads ${missing.map((f) => `"${f}"`).join(", ")}, which ${missing.length > 1 ? "are" : "is"} no longer sent` };
    }
    if (wrongType.length > 0) {
      // A string price concatenates instead of adding.
      return { listener, works: false, shown: `€${total}${payload.price}`, reason: `"price" arrives as a string, so ${total} + "${payload.price}" joins the text instead of adding` };
    }
    return { listener, works: true, shown: `€${total + (payload.price as number) * quantity}`, reason: "every field it reads is there with the type it expects" };
  });
}

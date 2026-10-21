import { z } from "zod";

// The search contract shared by the testing page's route and its request-level
// fake. v1 is what the page's app code reads; v2 is the "new release" that
// renames the fields.

export const SEARCH_SHAPES = ["v1", "v2"] as const;
export type SearchShape = (typeof SEARCH_SHAPES)[number];

export const searchParamsSchema = z.object({
  q: z.string().trim().max(40).default(""),
  shape: z.enum(SEARCH_SHAPES).default("v1"),
});

export type Product = { id: number; name: string };

export const PRODUCTS: readonly Product[] = [
  { id: 1, name: "Café mug" },
  { id: 2, name: "Travel mug" },
  { id: 3, name: "Teapot" },
  { id: 4, name: "Coffee grinder" },
  { id: 5, name: "Milk jug" },
];

export type SearchReplyV1 = { items: { id: number; name: string }[] };
export type SearchReplyV2 = { results: { sku: string; title: string }[] };

export function findProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  return PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

/** The reply body for a version of the contract. */
export function shapeReply(products: readonly Product[], shape: SearchShape): SearchReplyV1 | SearchReplyV2 {
  return shape === "v1"
    ? { items: products.map((p) => ({ id: p.id, name: p.name })) }
    : { results: products.map((p) => ({ sku: `P-${p.id}`, title: p.name })) };
}

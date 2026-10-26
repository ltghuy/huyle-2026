import "server-only";

import { normalizeQuery, type Product } from "./search.schema";

// Every style × material × product type: 12 × 12 × 39 = 5,616 products.
// Deterministic, so runs are repeatable; built on first request, not at
// import (next build imports route modules in its workers).

const STYLES = [
  "Classic", "Compact", "Cordless", "Deluxe", "Ergonomic", "Foldable",
  "Minimal", "Modern", "Nordic", "Rustic", "Smart", "Vintage",
];

const MATERIALS = [
  "Bamboo", "Brass", "Ceramic", "Copper", "Glass", "Linen",
  "Marble", "Oak", "Steel", "Velvet", "Walnut", "Wool",
];

const TYPES: Record<string, string[]> = {
  Lighting: ["Desk Lamp", "Floor Lamp", "Lamp Shade", "Night Light", "Pendant Light", "Wall Sconce"],
  Furniture: ["Bench", "Bookshelf", "Chair", "Desk", "Side Table", "Sofa", "Standing Desk", "Stool"],
  Kitchen: ["Bowl", "Café Mug", "Crème Brûlée Dish", "Cutting Board", "Jalapeño Grinder", "Kettle", "Mug", "Teapot"],
  Office: ["Desk Mat", "Desk Organizer", "Monitor Stand", "Notebook", "Paper Tray", "Pen Holder"],
  Textiles: ["Cushion", "Curtain", "Rug", "Table Runner", "Throw Blanket"],
  Decor: ["Candle Holder", "Mirror", "Photo Frame", "Planter", "Vase", "Wall Clock"],
};

export type IndexedProduct = {
  product: Product;
  /** Normalized name, for "starts with the query" ranking. */
  name: string;
  /** Normalized words of the name and category. */
  words: string[];
};

/** Small deterministic hash → price between $8 and $480. */
function priceFor(n: number) {
  const x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return 800 + (x % 47_200);
}

let catalog: IndexedProduct[] | null = null;

export function getCatalog(): IndexedProduct[] {
  if (catalog) return catalog;
  const list: IndexedProduct[] = [];
  let n = 0;
  for (const [category, types] of Object.entries(TYPES)) {
    for (const type of types) {
      for (const style of STYLES) {
        for (const material of MATERIALS) {
          n += 1;
          const name = `${style} ${material} ${type}`;
          const normalized = normalizeQuery(name);
          list.push({
            product: { id: `p${String(n).padStart(4, "0")}`, name, category, price: priceFor(n) },
            name: normalized,
            words: [...normalized.split(" "), normalizeQuery(category)],
          });
        }
      }
    }
  }
  catalog = list;
  return list;
}

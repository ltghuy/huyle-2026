// A sample shoe catalogue with three filters and a sort, to show how facets
// multiply URLs and what each crawl strategy from Google's faceted
// navigation guide does with them. The products are made up.

export const FILTERS = {
  brand: ["acme", "brio", "cova"],
  color: ["black", "blue", "red", "white"],
  size: ["38", "40", "42", "44"],
} as const;

export type FilterKey = keyof typeof FILTERS;

/** The order the site writes parameters in, whatever order they were picked. */
export const FILTER_ORDER: FilterKey[] = ["brand", "color", "size"];

export type Product = { brand: string; color: string; size: string };

export const PRODUCTS: Product[] = Array.from({ length: 24 }, (_, i) => ({
  brand: FILTERS.brand[i % 3],
  color: FILTERS.color[Math.floor(i / 3) % 4],
  size: FILTERS.size[(i * 5) % 4],
})).filter((p) => !(p.brand === "cova" && p.color === "white"));

export type Strategy = "robots" | "fragment" | "indexable";

export const STRATEGY_LABEL: Record<Strategy, string> = {
  robots: "Block filtered URLs in robots.txt",
  fragment: "Filters after # (fragment)",
  indexable: "Indexable parameters",
};

export type Picked = { key: FilterKey; value: string }[];

const query = (picked: Picked, sort: boolean) => [...picked.map((p) => `${p.key}=${p.value}`), ...(sort ? ["sort=price"] : [])].join("&");

const normalize = (picked: Picked) => [...picked].sort((a, b) => FILTER_ORDER.indexOf(a.key) - FILTER_ORDER.indexOf(b.key));

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/** Filter URLs the catalogue can produce, with a fixed parameter order and when any order is linked. Sort doubles both. */
export function urlCounts() {
  const sizes = FILTER_ORDER.map((k) => FILTERS[k].length);
  const fixed = sizes.reduce((n, s) => n * (s + 1), 1);
  // Every subset of filters, each value choice, in every order.
  let anyOrder = 0;
  for (let mask = 0; mask < 1 << sizes.length; mask++) {
    const chosen = sizes.filter((_, i) => mask & (1 << i));
    anyOrder += chosen.reduce((n, s) => n * s, 1) * factorial(chosen.length);
  }
  return { fixed: fixed * 2, anyOrder: anyOrder * 2 };
}

export type Outcome = {
  linked: string;
  normalized: string;
  matches: number;
  crawled: string;
  status: string;
  canonical: string;
  notes: string[];
};

export function outcome(picked: Picked, sort: boolean, strategy: Strategy): Outcome {
  const matches = PRODUCTS.filter((p) => picked.every((f) => p[f.key] === f.value)).length;
  const q = query(picked, sort);
  const normalQ = query(normalize(picked), false);
  const filtered = q !== "";
  const notes: string[] = [];

  if (strategy === "fragment") {
    return {
      linked: filtered ? `/shoes#${q}` : "/shoes",
      normalized: "/shoes",
      matches,
      crawled: "/shoes: Google ignores what follows #, so only the unfiltered page is crawled",
      status: "200 for /shoes",
      canonical: "/shoes",
      notes: ["Filtered views can't be indexed or linked to from search. Fine when nobody searches for them."],
    };
  }

  const linked = filtered ? `/shoes?${q}` : "/shoes";
  const normalized = normalQ ? `/shoes?${normalQ}` : "/shoes";
  if (picked.map((p) => p.key).join() !== normalize(picked).map((p) => p.key).join()) {
    notes.push("Picked out of order. Always link the normalized URL, so one filter set has one URL.");
  }

  if (strategy === "robots") {
    return {
      linked,
      normalized,
      matches,
      crawled: filtered ? "Not crawled: Disallow: /*? blocks every URL with parameters" : "/shoes is allowed",
      status: filtered ? "Never requested" : "200",
      canonical: "/shoes",
      notes: [...notes, "Crawlers spend their time on /shoes and the product pages instead."],
    };
  }

  if (sort) notes.push("Sorting doesn't change the set of products, so the canonical drops it.");
  return {
    linked,
    normalized,
    matches,
    crawled: "Crawled and may be indexed",
    status: matches === 0 ? "404: no products match, so the URL itself answers 404" : "200",
    canonical: matches === 0 ? "none (a 404 has no canonical)" : normalized,
    notes,
  };
}

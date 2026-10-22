// Checks for JSON-LD blocks against Google's documented properties
// (.artifacts/research/seo-fundamentals.md, "Structured data").

export type Preview = "article" | "breadcrumb" | "product" | "none";

type TypeRule = { required: string[]; recommended: string[]; preview: Preview; note?: string; anyOf?: string[] };

const ARTICLE: TypeRule = {
  required: [],
  recommended: ["headline", "image", "datePublished", "dateModified", "author", "author.name", "author.url"],
  preview: "article",
  note: "Google lists no required properties for Article; it uses what you provide.",
};

export const TYPE_RULES: Record<string, TypeRule> = {
  Article: ARTICLE,
  NewsArticle: ARTICLE,
  BlogPosting: ARTICLE,
  BreadcrumbList: { required: ["itemListElement"], recommended: [], preview: "breadcrumb" },
  Product: {
    required: ["name"],
    anyOf: ["offers", "review", "aggregateRating"],
    recommended: ["image", "description", "offers.price", "offers.priceCurrency"],
    preview: "product",
  },
  WebSite: { required: [], recommended: ["name", "url"], preview: "none", note: "Google reads WebSite for the site name shown with results; it has no rich result of its own." },
  FAQPage: {
    required: ["mainEntity"],
    recommended: [],
    preview: "none",
    note: "Since August 2023 FAQ rich results show only for well-known government and health sites, and FAQ is no longer in Google's search gallery. Valid markup, but most sites get nothing for it.",
  },
  HowTo: { required: ["name", "step"], recommended: [], preview: "none", note: "HowTo rich results were removed in 2023. The markup is valid schema.org, but Google doesn't show it." },
};

export type Check = { ok: boolean; text: string };

export type Validation = { type: string; known: boolean; checks: Check[]; note?: string; preview: Preview };

function has(obj: unknown, path: string): boolean {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (Array.isArray(current)) current = current[0];
    if (current === null || typeof current !== "object" || !(key in current)) return false;
    current = (current as Record<string, unknown>)[key];
  }
  return current !== undefined && current !== null && current !== "";
}

function breadcrumbChecks(obj: Record<string, unknown>): Check[] {
  const items = obj.itemListElement;
  if (!Array.isArray(items) || items.length === 0) return [];
  const checks: Check[] = [];
  items.forEach((raw, i) => {
    const item = raw as Record<string, unknown>;
    const last = i === items.length - 1;
    const label = `Breadcrumb ${i + 1}`;
    checks.push({ ok: item.position === i + 1, text: `${label}: position ${String(item.position)}${item.position === i + 1 ? "" : `, expected ${i + 1}`}` });
    checks.push({ ok: typeof item.name === "string" && item.name !== "", text: `${label}: name ${item.name ? `"${String(item.name)}"` : "missing"}` });
    if (!last || item.item) checks.push({ ok: typeof item.item === "string", text: `${label}: item ${item.item ? String(item.item) : "missing (only the last crumb may omit it)"}` });
  });
  return checks;
}

export function validate(obj: Record<string, unknown>): Validation {
  const type = String(obj["@type"] ?? "missing");
  const rule = TYPE_RULES[type];
  const checks: Check[] = [{ ok: obj["@context"] === "https://schema.org" || obj["@context"] === "http://schema.org", text: `@context ${obj["@context"] ? String(obj["@context"]) : "missing"}` }];
  if (!rule) return { type, known: false, checks, preview: "none", note: `${type} isn't one of the types this checker knows. Check Google's search gallery for whether it has a rich result.` };
  for (const p of rule.required) checks.push({ ok: has(obj, p), text: `${p} (required)${has(obj, p) ? "" : " is missing"}` });
  if (rule.anyOf) {
    const found = rule.anyOf.filter((p) => has(obj, p));
    checks.push({ ok: found.length > 0, text: found.length > 0 ? `${found.join(", ")} present (one of ${rule.anyOf.join(", ")} is required)` : `One of ${rule.anyOf.join(", ")} is required` });
  }
  for (const p of rule.recommended) checks.push({ ok: has(obj, p), text: `${p} (recommended)${has(obj, p) ? "" : " is missing"}` });
  if (type === "BreadcrumbList") checks.push(...breadcrumbChecks(obj));
  return { type, known: true, checks, note: rule.note, preview: rule.preview };
}

/** The objects in a JSON-LD value: a single object, an array, or an @graph. */
export function objectsIn(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj["@graph"])) return obj["@graph"].flatMap(objectsIn);
    return [obj];
  }
  return [];
}

export const SAMPLES: Record<string, string> = {
  Article: JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How search works",
      image: ["https://learn.huyle.work/og/topic/how-search-works"],
      datePublished: "2026-10-22T00:00:00+07:00",
      dateModified: "2026-10-22T00:00:00+07:00",
      author: { "@type": "Person", name: "Huy Le", url: "https://learn.huyle.work" },
    },
    null,
    2,
  ),
  BreadcrumbList: JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Handbook", item: "https://learn.huyle.work" },
        { "@type": "ListItem", position: 2, name: "SEO", item: "https://learn.huyle.work/seo" },
        { "@type": "ListItem", position: 3, name: "How search works" },
      ],
    },
    null,
    2,
  ),
  Product: JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Pour-over kettle",
      image: "https://example.com/kettle.jpg",
      offers: { "@type": "Offer", price: "49.00", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.6", reviewCount: "128" },
    },
    null,
    2,
  ),
  FAQPage: JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [{ "@type": "Question", name: "Does robots.txt remove a page from Google?", acceptedAnswer: { "@type": "Answer", text: "No. Use noindex." } }],
    },
    null,
    2,
  ),
  HowTo: JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Brew pour-over coffee",
      step: [{ "@type": "HowToStep", text: "Rinse the filter." }],
    },
    null,
    2,
  ),
};

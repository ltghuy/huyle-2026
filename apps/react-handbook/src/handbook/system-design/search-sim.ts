// The autocomplete demos' local "backend": a word list, substring matching, and
// a deterministic latency per query so a replayed burst reliably produces an
// out-of-order arrival (a slow earlier request resolving after a fast later one).
// Client-only; the "network" is just a setTimeout.

export const CORPUS = [
  "react", "react native", "reactivity", "redux", "remix", "rendering", "resilience",
  "svelte", "solid", "signals", "server components", "suspense", "streaming",
  "javascript", "typescript", "jsx", "json", "jest",
  "accessibility", "aria", "autocomplete", "animation",
  "cache", "cursor pagination", "cors", "csp", "component",
  "debounce", "design system", "dom", "data fetching",
  "performance", "prefetch", "pagination", "profiling",
  "vite", "vitest", "virtualization", "viewport",
];

export function normalize(query: string): string {
  return query.trim().toLowerCase();
}

/** Substring match against the corpus, best (prefix) first, capped. */
export function search(query: string, limit = 6): string[] {
  const q = normalize(query);
  if (q === "") return [];
  const hits = CORPUS.filter((term) => term.includes(q));
  hits.sort((a, b) => {
    const ap = a.startsWith(q) ? 0 : 1;
    const bp = b.startsWith(q) ? 0 : 1;
    return ap - bp || a.length - b.length || a.localeCompare(b);
  });
  return hits.slice(0, limit);
}

// Deterministic latency: shorter queries are slower, so as the user types one
// more character the newer (longer) request is faster and resolves first —
// the classic out-of-order race. Values stay in a demo-friendly range.
export function latencyFor(query: string): number {
  const len = normalize(query).length;
  const base = Math.max(200, 1000 - len * 140);
  // a little deterministic jitter from the last character, so equal lengths differ
  const last = query.charCodeAt(query.length - 1) || 0;
  return base + (last % 5) * 30;
}

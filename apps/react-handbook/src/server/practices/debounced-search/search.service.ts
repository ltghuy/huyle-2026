import "server-only";

import { getCatalog } from "./search.data";
import {
  normalizeQuery,
  RESULT_LIMIT,
  type LatencyMode,
  type SearchResult,
} from "./search.schema";

const SHORT_QUERY_PENALTY_MS = 150;
const SHORT_QUERY_LENGTH = 8;

/** Every query word must start a word of the name or category. */
export function searchProducts(rawQuery: string): Omit<SearchResult, "latencyMs"> {
  const query = normalizeQuery(rawQuery);
  const terms = query.split(" ").filter(Boolean);
  if (terms.length === 0) return { query, items: [], total: 0 };

  const matches = getCatalog().filter((p) =>
    terms.every((term) => p.words.some((word) => word.startsWith(term))),
  );
  // Names that start with the query first, then alphabetical.
  const sorted = matches.toSorted((a, b) => {
    const aStarts = a.name.startsWith(query) ? 0 : 1;
    const bStarts = b.name.startsWith(query) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });
  return {
    query,
    items: sorted.slice(0, RESULT_LIMIT).map((p) => p.product),
    total: matches.length,
  };
}

/** Base + random extra; "shorter-slower" adds a penalty per missing character. */
export function simulatedLatency(
  query: string,
  { latencyMs, jitterMs, mode }: { latencyMs: number; jitterMs: number; mode: LatencyMode },
) {
  const jitter = Math.round(Math.random() * jitterMs);
  const penalty =
    mode === "shorter-slower"
      ? SHORT_QUERY_PENALTY_MS * Math.max(0, SHORT_QUERY_LENGTH - normalizeQuery(query).length)
      : 0;
  return latencyMs + jitter + penalty;
}

/** Resolves after `ms`, or early (false) when the client aborts. */
export function delay(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const timer = setTimeout(() => resolve(true), ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve(false);
      },
      { once: true },
    );
  });
}

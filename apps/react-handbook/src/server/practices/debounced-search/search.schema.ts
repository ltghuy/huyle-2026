import { z } from "zod";

// Shared by the mock API and the client: one normalization function means
// the cache key, the request parameter and "same query" all agree.

export const MAX_QUERY_LENGTH = 100;
export const RESULT_LIMIT = 20;

const MARKS = /\p{M}/gu;
const SPACES = /\s+/g;

/** Trim, collapse spaces, lowercase, strip accents, cut to 100 characters. */
export function normalizeQuery(text: string): string {
  return text
    .normalize("NFD")
    .replace(MARKS, "")
    .toLowerCase()
    .replace(SPACES, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .trimEnd();
}

export const LATENCY_MODES = ["random", "shorter-slower"] as const;
export type LatencyMode = (typeof LATENCY_MODES)[number];

export const searchParamsSchema = z.object({
  q: z.string().max(200).default(""),
  latencyMs: z.coerce.number().int().min(0).max(5000).default(0),
  jitterMs: z.coerce.number().int().min(0).max(5000).default(0),
  mode: z.enum(LATENCY_MODES).default("random"),
  failRate: z.coerce.number().min(0).max(1).default(0),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

export type Product = {
  id: string;
  name: string;
  category: string;
  /** Cents. */
  price: number;
};

export type SearchResult = {
  /** The normalized query these results are for. */
  query: string;
  items: Product[];
  total: number;
  /** The delay the server simulated for this response. */
  latencyMs: number;
};

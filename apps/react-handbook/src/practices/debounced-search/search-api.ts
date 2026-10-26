import type {
  LatencyMode,
  SearchResult,
} from "@/server/practices/debounced-search/search.schema";

const ENDPOINT = "/api/practices/debounced-search/search";

/** Read at request time, so demo controls apply to the next request. */
export const network = {
  latencyMs: 300,
  jitterMs: 700,
  mode: "random" as LatencyMode,
  failRate: 0,
};

export type Fetcher = (query: string, signal: AbortSignal) => Promise<SearchResult>;

export const fetchSearch: Fetcher = async (query, signal) => {
  const params = new URLSearchParams({
    q: query,
    latencyMs: String(network.latencyMs),
    jitterMs: String(network.jitterMs),
    mode: network.mode,
    failRate: String(network.failRate),
  });
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?${params}`, { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error("Can't reach the server. Check your connection and retry.");
  }
  // Reading the body can also be aborted; that rejection propagates as is.
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `Search failed (HTTP ${res.status}).`);
  return json.data;
};

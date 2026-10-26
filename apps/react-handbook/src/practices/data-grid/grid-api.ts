import type { DatasetSize, Employee, QueryBody, QueryResult } from "@/server/practices/data-grid/grid.schema";

const BASE = "/api/practices/data-grid";

export type Timed<T> = { data: T; bytes: number; ms: number };

export type DatasetFetcher = (size: DatasetSize, latencyMs: number, signal: AbortSignal) => Promise<Timed<Employee[]>>;
export type QueryFetcher = (body: QueryBody, signal: AbortSignal) => Promise<Timed<QueryResult>>;

const encoder = new TextEncoder();

/** Fetches JSON, measuring the body size and the round trip. */
async function timedJson<T>(input: string, init: RequestInit, failure: string): Promise<Timed<T>> {
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new Error("Can't reach the server. Check your connection and retry.");
  }
  // Reading the body can also be aborted; that rejection propagates as is.
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${failure} (HTTP ${res.status}).`);
  }
  if (!res.ok) throw new Error(json.error?.message ?? `${failure} (HTTP ${res.status}).`);
  return { data: json.data, bytes: encoder.encode(text).byteLength, ms: performance.now() - started };
}

export const fetchDataset: DatasetFetcher = (size, latencyMs, signal) =>
  timedJson(`${BASE}/employees?size=${size}&latencyMs=${latencyMs}`, { signal }, "Download failed");

export const fetchQuery: QueryFetcher = (body, signal) =>
  timedJson(
    `${BASE}/query`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal },
    "Query failed",
  );

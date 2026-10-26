import type { FeedPage, NewerResult } from "@/server/practices/infinite-scroll/feed.schema";

const BASE = "/api/practices/infinite-scroll/feed";

export type PageRequest = {
  cursor: string | null;
  limit: number;
  latencyMs: number;
  failRate: number;
};

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export async function fetchPage(request: PageRequest, signal: AbortSignal) {
  const params = new URLSearchParams({
    limit: String(request.limit),
    latencyMs: String(request.latencyMs),
    failRate: String(request.failRate),
  });
  if (request.cursor) params.set("cursor", request.cursor);
  return readJson<FeedPage>(await fetch(`${BASE}?${params}`, { signal }));
}

export async function fetchNewer(after: string) {
  const res = await fetch(`${BASE}/newer?${new URLSearchParams({ after })}`);
  return (await readJson<{ data: NewerResult }>(res)).data;
}

export async function simulatePosts() {
  const res = await fetch(`${BASE}/simulate`, { method: "POST" });
  return (await readJson<{ data: { created: number; total: number } }>(res)).data;
}

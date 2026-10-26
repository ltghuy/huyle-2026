import "server-only";

import type { CacheLogEntry, CacheRule } from "./http-echo.schema";

// Per-run request log for the caching demo, on globalThis so dev reloads and
// both routes share it. Old runs are dropped past MAX_RUNS.
const MAX_RUNS = 200;
const store = ((globalThis as { __cacheLab?: Map<string, CacheLogEntry[]> }).__cacheLab ??= new Map());

function logFor(run: string) {
  let log = store.get(run);
  if (!log) {
    log = [];
    store.set(run, log);
    if (store.size > MAX_RUNS) store.delete(store.keys().next().value!);
  }
  return log;
}

const CACHE_CONTROL: Record<CacheRule, string> = {
  "no-store": "no-store",
  "max-age": "private, max-age=300",
  etag: "no-cache",
};

/** Answer one request for the cached resource, recording it in the run's log. */
export function serveCached(request: Request, rule: CacheRule, run: string): Response {
  const log = logFor(run);
  const etag = `"${run}-${rule}"`;
  const headers = new Headers({ "Cache-Control": CACHE_CONTROL[rule] });
  if (rule === "etag") headers.set("ETag", etag);

  const notModified = rule === "etag" && request.headers.get("if-none-match") === etag;
  log.push({ n: log.length + 1, rule, status: notModified ? 304 : 200 });
  if (notModified) return new Response(null, { status: 304, headers });
  return Response.json({ data: { version: 1, servedAt: new Date().toISOString() } }, { headers });
}

export function cacheLog(run: string): CacheLogEntry[] {
  return store.get(run) ?? [];
}

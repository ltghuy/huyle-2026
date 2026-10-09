import "server-only";

import type { CorsLogEntry, CorsParams } from "./cors-lab.schema";

// The CORS demo's server: it answers with the CORS headers the learner chose
// and logs every request it receives (preflights too), per run, on globalThis.
const MAX_RUNS = 200;
const store = ((globalThis as { __corsLab?: Map<string, CorsLogEntry[]> }).__corsLab ??= new Map());

function logFor(run: string) {
  let log = store.get(run);
  if (!log) {
    log = [];
    store.set(run, log);
    if (store.size > MAX_RUNS) store.delete(store.keys().next().value!);
  }
  return log;
}

function corsHeaders(request: Request, params: CorsParams, preflight: boolean) {
  const headers = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  if (params.allow === "none") return headers;
  // "origin" echoes the caller's Origin; for the demo's sandboxed iframe that is "null".
  headers.set("Access-Control-Allow-Origin", params.allow === "any" ? "*" : (request.headers.get("origin") ?? "null"));
  if (params.credentials) headers.set("Access-Control-Allow-Credentials", "true");
  if (preflight) {
    headers.set("Access-Control-Allow-Methods", params.put ? "GET, POST, PUT" : "GET, POST");
    if (params.header) headers.set("Access-Control-Allow-Headers", "Content-Type, X-Demo");
    headers.set("Access-Control-Max-Age", "0");
  }
  return headers;
}

export function handleCors(request: Request, params: CorsParams): Response {
  const preflight = request.method === "OPTIONS";
  logFor(params.run).push({
    n: params.n,
    method: request.method,
    origin: request.headers.get("origin"),
    preflight,
    requestMethod: request.headers.get("access-control-request-method"),
    requestHeaders: request.headers.get("access-control-request-headers"),
  });
  const headers = corsHeaders(request, params, preflight);
  if (preflight) return new Response(null, { status: 204, headers });
  return Response.json({ data: { method: request.method, message: "Hello from the server" } }, { headers });
}

export function corsLog(run: string): CorsLogEntry[] {
  return store.get(run) ?? [];
}

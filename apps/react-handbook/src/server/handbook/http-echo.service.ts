import "server-only";

import { type EchoReceived, type EchoStatus, MAX_ECHO_BODY } from "./http-echo.schema";

// Headers the browser sends that only add noise to the demo.
const HIDDEN = /^(cookie|sec-ch-|x-forwarded-|x-real-ip|x-middleware|next-|rsc|priority$|connection$)/i;

export async function readEcho(request: Request): Promise<EchoReceived | "too-large"> {
  const text = request.method === "GET" || request.method === "HEAD" ? "" : await request.text();
  if (text.length > MAX_ECHO_BODY) return "too-large";
  const url = new URL(request.url);
  return {
    method: request.method,
    url: url.pathname + url.search,
    headers: [...request.headers].filter(([name]) => !HIDDEN.test(name)),
    body: text || null,
  };
}

/** The response for a chosen status, with the headers that status usually carries. */
export function echoResponse(status: EchoStatus, received: EchoReceived): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (status === 301) {
    headers.set("Location", "/api/handbook/http?status=200&redirectedFrom=301");
    return new Response(null, { status, headers });
  }
  if (status === 204) return new Response(null, { status, headers });
  if (status === 401) headers.set("WWW-Authenticate", 'Bearer realm="handbook"');
  if (status === 429 || status === 503) headers.set("Retry-After", "30");
  if (status === 201) headers.set("Location", "/api/handbook/http/items/42");
  return Response.json({ data: { received } }, { status, headers });
}

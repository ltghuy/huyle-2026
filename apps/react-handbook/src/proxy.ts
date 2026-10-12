import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Make full-page responses edge-cacheable on Cloudflare.
//
// Next sends `Vary: rsc, next-router-state-tree, …` on every page so the client
// router can cache RSC and HTML separately. Cloudflare, however, refuses to
// cache any response whose `Vary` contains anything other than `Accept-Encoding`,
// so our Cache Rule never takes effect and every page boots the Worker (the
// cold-start that produced the 1102).
//
// For document navigations only (`Sec-Fetch-Dest: document`) we replace that
// `Vary` with `Accept-Encoding`, which lets Cloudflare cache the page HTML.
// RSC and prefetch fetches (`Sec-Fetch-Dest: empty`) are left untouched, so
// client-side routing keeps its correct Vary and is never cached.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.headers.get("sec-fetch-dest") === "document") {
    response.headers.set("vary", "Accept-Encoding");
  }
  return response;
}

export const config = {
  // Run on page routes only; skip the API, Next internals and static files.
  // Must be a plain string literal: Next statically analyses the matcher at
  // build time and rejects anything it can't evaluate (e.g. String.raw`…`).
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};

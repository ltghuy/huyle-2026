// What the browser's CORS check should decide for a request and a server
// policy (Fetch standard, main cases only). The demo shows this next to what
// the browser really did.

export type CorsRequest = { method: "GET" | "POST" | "PUT"; json: boolean; customHeader: boolean; credentials: boolean };
export type CorsPolicy = { allow: "none" | "any" | "origin"; put: boolean; header: boolean; credentials: boolean };

export function needsPreflight(request: CorsRequest) {
  return request.method === "PUT" || request.json || request.customHeader;
}

/** Why a preflight is sent, in words. */
export function preflightReasons(request: CorsRequest) {
  return [
    request.method === "PUT" ? "PUT isn't a simple method (GET, HEAD, POST are)" : null,
    request.json ? "Content-Type: application/json isn't one of the three simple types" : null,
    request.customHeader ? "X-Demo isn't a safelisted header" : null,
  ].filter((x): x is string => x !== null);
}

export function explain(request: CorsRequest, policy: CorsPolicy): { allowed: boolean; reason: string } {
  if (policy.allow === "none") {
    return needsPreflight(request)
      ? { allowed: false, reason: "The preflight answer has no Access-Control-Allow-Origin header, so the real request is never sent." }
      : { allowed: false, reason: "The response has no Access-Control-Allow-Origin header, so the browser hides it from the page (the server still handled it)." };
  }
  if (request.credentials && policy.allow === "any") {
    return { allowed: false, reason: "With credentials, Access-Control-Allow-Origin: * isn't accepted; the server must name the origin." };
  }
  if (request.credentials && !policy.credentials) {
    return { allowed: false, reason: "With credentials, the server must also send Access-Control-Allow-Credentials: true." };
  }
  if (needsPreflight(request)) {
    if (request.method === "PUT" && !policy.put) return { allowed: false, reason: "The preflight answer doesn't list PUT in Access-Control-Allow-Methods, so the real request is never sent." };
    const headersNeeded = (request.json ? 1 : 0) + (request.customHeader ? 1 : 0);
    if (headersNeeded > 0 && !policy.header) {
      return { allowed: false, reason: "The preflight answer doesn't list the request's headers in Access-Control-Allow-Headers, so the real request is never sent." };
    }
    return { allowed: true, reason: "The preflight was approved, then the real request was sent and its response shared with the page." };
  }
  return { allowed: true, reason: "A simple request: sent directly, and the response carries a matching Access-Control-Allow-Origin." };
}

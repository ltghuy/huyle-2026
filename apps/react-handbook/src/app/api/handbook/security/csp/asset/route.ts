// The CSP demo's "external script": it runs only if the policy allows it.
export function GET() {
  return new Response("window.__external=1;", {
    headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-store" },
  });
}

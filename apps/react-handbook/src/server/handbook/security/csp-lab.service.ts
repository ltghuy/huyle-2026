import "server-only";

import type { CspPageParams, ScriptSrc } from "./security.schema";

// Serves a sample page with exactly the Content-Security-Policy the learner
// built, as a real response header. The page tries four scripts and an image;
// each script that the policy allows sets a window marker, which the (same-
// origin) demo reads to see what ran. No reporting script is used, so a policy
// that blocks all scripts still gives an honest result.

const TEST_NONCE = "r4nd0mdemo";

// A 1×1 transparent GIF, so img-src can be shown allowing/blocking it.
const DATA_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

const SCRIPT_SRC: Record<ScriptSrc, string> = {
  none: "'none'",
  self: "'self'",
  nonce: `'nonce-${TEST_NONCE}'`,
  "unsafe-inline": "'unsafe-inline'",
  "strict-dynamic": `'strict-dynamic' 'nonce-${TEST_NONCE}'`,
};

export function cspHeader(params: CspPageParams): { name: string; value: string } {
  const value = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src ${params.img ? "'self' data:" : "'none'"}`,
    `script-src ${SCRIPT_SRC[params.script]}`,
  ].join("; ");
  return { name: params.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value };
}

export function cspPageHtml(): string {
  // Each script sets a marker only if the policy lets it run. The external
  // script carries the test nonce so it runs under nonce / strict-dynamic too.
  return `<!doctype html><html><head><meta charset="utf-8">
<style>body{font:13px/1.5 system-ui,sans-serif;margin:0;padding:12px;color-scheme:light dark}
.row{display:flex;gap:6px;align-items:center;padding:2px 0}</style>
</head><body>
<p>Sample page. Four scripts and one image were attempted; the policy decides which run.</p>
<div class="row">Image: <img alt="" width="12" height="12" src="${DATA_IMG}"></div>
<script>window.__inline=1<\/script>
<script nonce="${TEST_NONCE}">window.__nonced=1<\/script>
<script nonce="${TEST_NONCE}" src="/api/handbook/security/csp/asset"><\/script>
</body></html>`;
}

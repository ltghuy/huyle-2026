import { z } from "zod";

import { jsonError } from "@/lib/http";
import { cspHeader, cspPageHtml } from "@/server/handbook/security/csp-lab.service";
import { cspPageSchema } from "@/server/handbook/security/security.schema";

// The CSP demo's sample page, served with exactly the learner's policy header.
export function GET(request: Request) {
  const parsed = cspPageSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const header = cspHeader(parsed.data);
  return new Response(cspPageHtml(), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", [header.name]: header.value },
  });
}

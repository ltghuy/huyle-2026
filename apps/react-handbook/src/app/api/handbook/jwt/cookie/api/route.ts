import { z } from "zod";

import { jsonError } from "@/lib/http";
import { cookieApiSchema } from "@/server/handbook/jwt/jwt.schema";
import { handleCookieApi } from "@/server/handbook/jwt/cookie-lab.service";

// The storage demo's protected API, called from the page, the injected script and another site.
function handle(request: Request) {
  const parsed = cookieApiSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return handleCookieApi(request, parsed.data.run, parsed.data.n, parsed.data.from);
}

export { handle as GET, handle as OPTIONS };

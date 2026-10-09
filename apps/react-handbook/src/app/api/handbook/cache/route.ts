import { z } from "zod";

import { jsonError } from "@/lib/http";
import { cacheParamsSchema } from "@/server/handbook/http-echo.schema";
import { serveCached } from "@/server/handbook/cache-lab.service";

export function GET(request: Request) {
  const parsed = cacheParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return serveCached(request, parsed.data.rule, parsed.data.run);
}

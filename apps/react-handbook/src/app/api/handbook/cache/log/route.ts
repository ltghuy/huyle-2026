import { z } from "zod";

import { jsonError } from "@/lib/http";
import { cacheLogParamsSchema } from "@/server/handbook/http-echo.schema";
import { cacheLog } from "@/server/handbook/cache-lab.service";

export function GET(request: Request) {
  const parsed = cacheLogParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json({ data: { entries: cacheLog(parsed.data.run) } }, { headers: { "Cache-Control": "no-store" } });
}

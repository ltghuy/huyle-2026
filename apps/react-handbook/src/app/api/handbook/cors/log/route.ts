import { z } from "zod";

import { jsonError } from "@/lib/http";
import { corsLogParamsSchema } from "@/server/handbook/cors-lab.schema";
import { corsLog } from "@/server/handbook/cors-lab.service";

export function GET(request: Request) {
  const parsed = corsLogParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json({ data: { entries: corsLog(parsed.data.run) } }, { headers: { "Cache-Control": "no-store" } });
}

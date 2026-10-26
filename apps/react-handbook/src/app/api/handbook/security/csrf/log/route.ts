import { z } from "zod";

import { jsonError } from "@/lib/http";
import { csrfLogSchema } from "@/server/handbook/security/security.schema";
import { csrfLog } from "@/server/handbook/security/csrf-lab.service";

export function GET(request: Request) {
  const parsed = csrfLogSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const log = csrfLog(parsed.data.sid);
  if (!log) return jsonError("Unknown session.", 404);
  return Response.json({ data: log }, { headers: { "Cache-Control": "no-store" } });
}

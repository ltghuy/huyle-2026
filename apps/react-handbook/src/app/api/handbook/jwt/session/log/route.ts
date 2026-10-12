import { z } from "zod";

import { jsonError } from "@/lib/http";
import { sessionLogSchema } from "@/server/handbook/jwt/jwt.schema";
import { sessionLog } from "@/server/handbook/jwt/session-lab.service";

export function GET(request: Request) {
  const parsed = sessionLogSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const log = sessionLog(parsed.data.sid);
  if (!log) return jsonError("Unknown session: the server may have restarted.", 404);
  return Response.json({ data: log }, { headers: { "Cache-Control": "no-store" } });
}

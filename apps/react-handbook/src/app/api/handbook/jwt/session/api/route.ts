import { z } from "zod";

import { jsonError } from "@/lib/http";
import { sessionApiSchema } from "@/server/handbook/jwt/jwt.schema";
import { callApi } from "@/server/handbook/jwt/session-lab.service";

// The protected API of the lifecycle demo: Authorization: Bearer <access token>.
export function GET(request: Request) {
  const parsed = sessionApiSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const { sid, leeway, actor } = parsed.data;
  const result = callApi(sid, request.headers.get("authorization"), leeway, actor);
  if (result.ok) return Response.json({ data: result.data }, { headers: { "Cache-Control": "no-store" } });
  return Response.json({ error: { message: result.message, issues: result.data } }, { status: result.status, headers: { "Cache-Control": "no-store", "WWW-Authenticate": 'Bearer error="invalid_token"' } });
}

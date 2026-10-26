import { z } from "zod";

import { jsonError } from "@/lib/http";
import { cookieRunSchema } from "@/server/handbook/jwt/jwt.schema";
import { cookieLog } from "@/server/handbook/jwt/cookie-lab.service";

export function GET(request: Request) {
  const parsed = cookieRunSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json({ data: { entries: cookieLog(parsed.data.run) } }, { headers: { "Cache-Control": "no-store" } });
}

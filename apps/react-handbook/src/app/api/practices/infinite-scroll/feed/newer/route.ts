import { z } from "zod";

import { jsonError } from "@/lib/http";
import { newerQuerySchema } from "@/server/practices/infinite-scroll/feed.schema";
import { getNewer } from "@/server/practices/infinite-scroll/feed.store";

export function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = newerQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  }

  const result = getNewer(parsed.data.after);
  if (!result) return jsonError("Invalid cursor", 422);
  return Response.json({ data: result });
}

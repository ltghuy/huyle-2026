import { z } from "zod";

import { jsonError } from "@/lib/http";
import { pageQuerySchema } from "@/server/practices/infinite-scroll/feed.schema";
import { getPage, withLatency } from "@/server/practices/infinite-scroll/feed.store";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = pageQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  }

  const { cursor, limit, latencyMs, failRate } = parsed.data;
  const result = await withLatency(latencyMs, failRate, () => getPage(cursor, limit));
  if (result.failed) return jsonError("Simulated server failure", 500);
  if (!result.value) return jsonError("Invalid cursor", 422);
  return Response.json(result.value);
}

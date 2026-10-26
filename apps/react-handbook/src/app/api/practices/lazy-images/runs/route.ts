import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import { runBodySchema, runQuerySchema } from "@/server/practices/lazy-images/photos.schema";
import { getRunStats, upsertRun } from "@/server/practices/lazy-images/photos.service";

/** Server-side counters for one run (requests, bytes, failures, cancellations). */
export function GET(request: Request) {
  const query = runQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));
  const stats = getRunStats(query.data.run);
  if (!stats) return jsonError("Unknown run", 404);
  return Response.json({ data: stats }, { headers: { "Cache-Control": "no-store" } });
}

/** Creates a run or updates its latency and failure rate (applies to the next image requests). */
export async function POST(request: Request) {
  const body = await parseBody(request, runBodySchema);
  if ("response" in body) return body.response;
  const { run, latencyMs, failRate } = body.data;
  return Response.json({ data: upsertRun(run, { latencyMs, failRate }) });
}

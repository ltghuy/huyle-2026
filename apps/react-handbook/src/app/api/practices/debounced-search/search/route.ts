import { z } from "zod";

import { jsonError } from "@/lib/http";
import { searchParamsSchema } from "@/server/practices/debounced-search/search.schema";
import {
  delay,
  searchProducts,
  simulatedLatency,
} from "@/server/practices/debounced-search/search.service";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = searchParamsSchema.safeParse(params);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  const { q, failRate, ...latency } = parsed.data;
  const latencyMs = simulatedLatency(q, latency);
  const completed = await delay(latencyMs, request.signal);
  // The client went away: nobody reads this response.
  if (!completed) return new Response(null, { status: 499 });

  if (Math.random() < failRate) return jsonError("Simulated server failure", 500);
  return Response.json({ data: { ...searchProducts(q), latencyMs } });
}

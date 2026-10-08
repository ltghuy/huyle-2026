import { jsonError, parseBody } from "@/lib/http";
import { queryBodySchema } from "@/server/practices/data-grid/grid.schema";
import { delay, runQuery, simulatedLatency } from "@/server/practices/data-grid/grid.service";

// A POST for a read: the selection can hold thousands of ids, which doesn't
// fit in a URL. The request has no side effects.
export async function POST(request: Request) {
  const parsed = await parseBody(request, queryBodySchema);
  if ("response" in parsed) return parsed.response;

  const { latencyMs, failRate } = parsed.data;
  const simulated = simulatedLatency(latencyMs);
  const completed = await delay(simulated, request.signal);
  if (!completed) return new Response(null, { status: 499 });

  if (Math.random() < failRate) return jsonError("Simulated server failure", 500);
  return Response.json({ data: { ...runQuery(parsed.data), latencyMs: simulated } });
}

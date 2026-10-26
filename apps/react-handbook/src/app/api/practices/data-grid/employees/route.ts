import { z } from "zod";

import { jsonError } from "@/lib/http";
import { getEmployees } from "@/server/practices/data-grid/employees.data";
import { datasetParamsSchema } from "@/server/practices/data-grid/grid.schema";
import { delay, simulatedLatency } from "@/server/practices/data-grid/grid.service";

/** Browser mode: the whole dataset, downloaded once per size. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = datasetParamsSchema.safeParse(params);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  const completed = await delay(simulatedLatency(parsed.data.latencyMs), request.signal);
  // The client went away: nobody reads this response.
  if (!completed) return new Response(null, { status: 499 });

  return Response.json({ data: getEmployees(parsed.data.size) });
}

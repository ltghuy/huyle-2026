import { z } from "zod";

import { jsonError } from "@/lib/http";
import { getInstruments } from "@/server/practices/large-dataset/instruments.data";
import { datasetParamsSchema } from "@/server/practices/large-dataset/instruments.schema";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = datasetParamsSchema.safeParse(params);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json({ data: getInstruments(parsed.data.size) });
}

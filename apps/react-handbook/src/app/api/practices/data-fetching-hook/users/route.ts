import { z } from "zod";

import { jsonError } from "@/lib/http";
import { networkQuerySchema } from "@/server/practices/data-fetching-hook/users.schema";
import { listUsers, simulateNetwork } from "@/server/practices/data-fetching-hook/users.store";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = networkQuerySchema.safeParse(params);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  const ok = await simulateNetwork(parsed.data.latencyMs, parsed.data.failRate);
  if (!ok) return jsonError("Simulated server failure", 500);
  return Response.json({ data: listUsers() });
}

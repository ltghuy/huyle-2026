import { z } from "zod";

import { jsonError } from "@/lib/http";
import { searchParamsSchema } from "@/server/handbook/testing-search.schema";
import { searchProducts } from "@/server/handbook/testing-search.service";

export function GET(request: Request) {
  const parsed = searchParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json(searchProducts(parsed.data.q, parsed.data.shape), { headers: { "Cache-Control": "no-store" } });
}

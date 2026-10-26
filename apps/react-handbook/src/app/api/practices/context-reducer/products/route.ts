import { z } from "zod";

import { jsonError } from "@/lib/http";
import { productsQuerySchema } from "@/server/practices/context-reducer/shop.schema";
import { delay, listProducts } from "@/server/practices/context-reducer/shop.store";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = productsQuerySchema.safeParse(params);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  await delay(parsed.data.latencyMs);
  return Response.json({ data: listProducts() });
}

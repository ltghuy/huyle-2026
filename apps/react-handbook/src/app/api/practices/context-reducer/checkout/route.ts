import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import { checkoutBodySchema, checkoutQuerySchema } from "@/server/practices/context-reducer/shop.schema";
import { checkout, delay } from "@/server/practices/context-reducer/shop.store";

export async function POST(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = checkoutQuerySchema.safeParse(params);
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));

  const body = await parseBody(request, checkoutBodySchema);
  if ("response" in body) return body.response;

  await delay(query.data.latencyMs);
  const result = checkout(body.data, query.data.fail);
  if (result.ok) return Response.json({ data: result.order });
  if (result.status === 409) return jsonError(result.message, 409, { adjustments: result.adjustments });
  return jsonError(result.message, 500);
}

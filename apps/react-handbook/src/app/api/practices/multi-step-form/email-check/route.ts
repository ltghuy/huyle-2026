import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import { emailCheckBodySchema, emailCheckQuerySchema } from "@/server/practices/multi-step-form/application.schema";
import { checkEmail, delay } from "@/server/practices/multi-step-form/application.store";

// POST, not GET: the email is personal data and stays out of the address.
export async function POST(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = emailCheckQuerySchema.safeParse(params);
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));

  const body = await parseBody(request, emailCheckBodySchema);
  if ("response" in body) return body.response;

  await delay(query.data.latencyMs);
  return Response.json({ data: checkEmail(body.data.email) });
}

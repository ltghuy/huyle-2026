import { z } from "zod";

import { jsonError } from "@/lib/http";
import { applicationsQuerySchema } from "@/server/practices/multi-step-form/application.schema";
import { delay, submitApplication } from "@/server/practices/multi-step-form/application.store";

export async function POST(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = applicationsQuerySchema.safeParse(params);
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));

  // Not parseBody: rejected answers are reported per step and field.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  await delay(query.data.latencyMs);
  const result = submitApplication(body, query.data.outcome);
  if (result.ok) return Response.json({ data: result.submission }, { status: 201 });
  if (result.status === 422) return jsonError("Some answers need attention", 422, { fields: result.issues });
  return jsonError(result.message, 500);
}

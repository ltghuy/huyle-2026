import { z } from "zod";

import { jsonError } from "@/lib/http";
import { faqQuerySchema } from "@/server/practices/searchable-accordion/faq.schema";
import { getFaq } from "@/server/practices/searchable-accordion/faq.service";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = faqQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  }

  const entries = await getFaq(parsed.data);
  if (!entries) return jsonError("Simulated server failure", 500);
  return Response.json({ data: entries });
}

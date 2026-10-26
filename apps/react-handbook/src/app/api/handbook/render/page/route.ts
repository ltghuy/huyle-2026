import { z } from "zod";

import { jsonError } from "@/lib/http";
import { loadSetupSchema } from "@/server/handbook/render-lab.schema";
import { samplePage } from "@/server/handbook/render-lab.service";

export function GET(request: Request) {
  const parsed = loadSetupSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return samplePage(parsed.data);
}

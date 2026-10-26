import { z } from "zod";

import { jsonError } from "@/lib/http";
import { assetParamsSchema } from "@/server/handbook/render-lab.schema";
import { slowAsset } from "@/server/handbook/render-lab.service";

export function GET(request: Request) {
  const parsed = assetParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return slowAsset(parsed.data);
}

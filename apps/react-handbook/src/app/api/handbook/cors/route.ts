import { z } from "zod";

import { jsonError } from "@/lib/http";
import { corsParamsSchema } from "@/server/handbook/cors-lab.schema";
import { handleCors } from "@/server/handbook/cors-lab.service";

// Every method of the CORS lab, preflight (OPTIONS) included.
function handle(request: Request) {
  const parsed = corsParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return handleCors(request, parsed.data);
}

export { handle as GET, handle as OPTIONS, handle as POST, handle as PUT };

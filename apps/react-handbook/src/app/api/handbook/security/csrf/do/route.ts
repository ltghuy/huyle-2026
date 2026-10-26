import { z } from "zod";

import { jsonError } from "@/lib/http";
import { csrfDoSchema } from "@/server/handbook/security/security.schema";
import { doTransfer } from "@/server/handbook/security/csrf-lab.service";

// The protected action (a transfer), called from the page and from another site.
function handle(request: Request) {
  const parsed = csrfDoSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return doTransfer(request, parsed.data);
}

export { handle as GET, handle as OPTIONS, handle as POST };

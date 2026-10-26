import { z } from "zod";

import { jsonError } from "@/lib/http";
import { echoParamsSchema, MAX_ECHO_BODY } from "@/server/handbook/http-echo.schema";
import { echoResponse, readEcho } from "@/server/handbook/http-echo.service";

// Answers with the status the caller asks for and echoes what it received.
async function handle(request: Request) {
  const parsed = echoParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const received = await readEcho(request);
  if (received === "too-large") return jsonError(`Body over ${MAX_ECHO_BODY} bytes`, 422);
  return echoResponse(parsed.data.status, received);
}

export { handle as DELETE, handle as GET, handle as POST, handle as PUT };

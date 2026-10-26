import "server-only";

import { z } from "zod";

import { jsonError } from "@/lib/http";
import { UploadError } from "./upload.store";

/** Maps store errors to the API error shape; 409s carry the server's offset. */
export function uploadErrorResponse(error: unknown) {
  if (error instanceof UploadError) {
    if (error.offset !== undefined) {
      return Response.json({ error: { message: error.message }, offset: error.offset }, { status: error.status });
    }
    return jsonError(error.message, error.status);
  }
  if (error instanceof z.ZodError) return jsonError("Validation failed", 422, z.treeifyError(error));
  throw error;
}

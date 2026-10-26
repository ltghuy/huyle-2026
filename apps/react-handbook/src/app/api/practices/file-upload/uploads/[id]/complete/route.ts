import { parseBody } from "@/lib/http";
import { completeBodySchema, uploadIdSchema } from "@/server/practices/file-upload/upload.schema";
import { completeUpload } from "@/server/practices/file-upload/upload.store";

import { uploadErrorResponse } from "@/server/practices/file-upload/upload.errors";

type Context = RouteContext<"/api/practices/file-upload/uploads/[id]/complete">;

export async function POST(request: Request, ctx: Context) {
  const body = await parseBody(request, completeBodySchema);
  if ("response" in body) return body.response;
  try {
    const id = uploadIdSchema.parse((await ctx.params).id);
    return Response.json({ data: await completeUpload(id, body.data.sha256) });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

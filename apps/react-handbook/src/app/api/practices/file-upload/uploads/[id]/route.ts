import { z } from "zod";

import { jsonError } from "@/lib/http";
import { pieceQuerySchema, uploadIdSchema } from "@/server/practices/file-upload/upload.schema";
import { appendPiece, deleteUpload, getUpload } from "@/server/practices/file-upload/upload.store";

import { uploadErrorResponse } from "@/server/practices/file-upload/upload.errors";

type Context = RouteContext<"/api/practices/file-upload/uploads/[id]">;

async function uploadId(ctx: Context) {
  return uploadIdSchema.parse((await ctx.params).id);
}

export async function GET(_request: Request, ctx: Context) {
  try {
    return Response.json({ data: await getUpload(await uploadId(ctx)) });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

/** One piece: raw bytes at `?offset=`, confirmed only once fully stored. */
export async function PUT(request: Request, ctx: Context) {
  const query = pieceQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));
  const length = Number(request.headers.get("content-length") ?? 0);
  try {
    const id = await uploadId(ctx);
    const upload = await appendPiece(id, query.data.offset, length, request.body, request.signal);
    return Response.json({ data: upload });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: Context) {
  try {
    await deleteUpload(await uploadId(ctx));
    return new Response(null, { status: 204 });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

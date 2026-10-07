import { parseBody } from "@/lib/http";
import { createBodySchema } from "@/server/practices/file-upload/upload.schema";
import { createUpload } from "@/server/practices/file-upload/upload.store";

import { uploadErrorResponse } from "@/server/practices/file-upload/upload.errors";

export async function POST(request: Request) {
  const body = await parseBody(request, createBodySchema);
  if ("response" in body) return body.response;
  try {
    const { upload, resumed } = await createUpload(body.data);
    return Response.json({ data: upload }, { status: resumed ? 200 : 201 });
  } catch (error) {
    return uploadErrorResponse(error);
  }
}

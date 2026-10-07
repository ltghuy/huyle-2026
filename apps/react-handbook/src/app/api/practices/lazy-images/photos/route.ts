import { z } from "zod";

import { jsonError } from "@/lib/http";
import { photosQuerySchema } from "@/server/practices/lazy-images/photos.schema";
import { listPhotos } from "@/server/practices/lazy-images/photos.service";

export async function GET(request: Request) {
  const parsed = photosQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  const { count, latencyMs } = parsed.data;
  if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
  return Response.json({ data: listPhotos(count) });
}

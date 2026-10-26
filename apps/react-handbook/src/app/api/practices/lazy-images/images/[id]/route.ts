import { z } from "zod";

import { jsonError } from "@/lib/http";
import { imageQuerySchema, photoIdSchema } from "@/server/practices/lazy-images/photos.schema";
import { serveImage } from "@/server/practices/lazy-images/photos.service";

type Context = RouteContext<"/api/practices/lazy-images/images/[id]">;

const NO_STORE = { "Cache-Control": "no-store" };

/** One generated photo at one candidate width. Latency and failures come from the run's settings. */
export async function GET(request: Request, ctx: Context) {
  const id = photoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError("Unknown photo", 404);
  const query = imageQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));

  const result = await serveImage(id.data, query.data.w, query.data.run, request.signal);
  switch (result.kind) {
    case "ok":
      return new Response(result.svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          // Each run and retry has its own URL, so caching is safe: revealing
          // a preloaded image reuses this response instead of fetching again.
          "Cache-Control": "private, max-age=3600",
        },
      });
    case "not-found":
      return jsonError("Unknown photo", 404);
    case "unknown-run":
      return jsonError("Unknown run; start a new one", 404);
    case "failed":
      return Response.json(
        { error: { message: "Simulated server failure" } },
        { status: 500, headers: NO_STORE },
      );
    case "cancelled":
      // The client has gone; nobody reads this.
      return new Response(null, { status: 499, headers: NO_STORE });
  }
}

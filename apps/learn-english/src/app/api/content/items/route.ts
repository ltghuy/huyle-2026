import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  contentItemsQueryInput,
  contentItemsQuerySchema,
  type ContentItemsQuery,
  type StaleVersionResponse,
} from "@/server/content/content.schema";
import { getContentItems } from "@/server/content/content.service";
import { matchEdgeCache, putEdgeCache } from "@/server/content/edge-cache";
import { getDb } from "@/server/db";

const CACHE_HEADER = "x-content-cache";
// A given (kind, level, v) never changes: a new publish bumps `v`.
const IMMUTABLE = "public, max-age=86400, immutable";

// One canonical URL per (kind, level, v), so extra or reordered params can't
// split the cache or bypass it.
function cacheKey(request: Request, { kind, level, v }: ContentItemsQuery): string {
  const url = new URL("/api/content/items", request.url);
  url.searchParams.set("kind", kind);
  if (level) url.searchParams.set("level", level);
  url.searchParams.set("v", String(v));
  return url.toString();
}

function withCacheStatus(response: Response, status: "HIT" | "MISS"): Response {
  const headers = new Headers(response.headers);
  headers.set(CACHE_HEADER, status);
  return new Response(response.body, { status: response.status, headers });
}

export async function GET(request: Request) {
  const parsed = contentItemsQuerySchema.safeParse(contentItemsQueryInput(new URL(request.url).searchParams));
  if (!parsed.success) {
    return jsonError("Tham số không hợp lệ.", 422, z.treeifyError(parsed.error));
  }
  const query = parsed.data;
  const key = cacheKey(request, query);

  const cached = await matchEdgeCache(key);
  if (cached) return withCacheStatus(cached, "HIT");

  let content;
  try {
    content = await getContentItems(getDb(), query);
  } catch (error) {
    console.error("Content items read failed:", error);
    return jsonError("Không tải được nội dung. Bạn thử lại sau nhé.", 503);
  }

  // Only the current version is served, so a request racing a publish can't
  // store old rows under the new version's URL. The client retries with it.
  if (content.version !== query.v) {
    return Response.json(
      {
        error: { message: "Nội dung vừa được cập nhật. Vui lòng tải lại." },
        version: content.version,
      } satisfies StaleVersionResponse,
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = JSON.stringify(content);
  const headers = { "Content-Type": "application/json", "Cache-Control": IMMUTABLE };
  putEdgeCache(key, new Response(body, { headers }));
  return new Response(body, { headers: { ...headers, [CACHE_HEADER]: "MISS" } });
}

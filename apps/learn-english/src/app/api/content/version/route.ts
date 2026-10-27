import { jsonError } from "@/lib/http";
import { getContentVersion } from "@/server/content/content.service";
import { getDb } from "@/server/db";

// Route handlers are dynamic by default in Next 16 (without Cache
// Components), so this runs per request and is never prerendered.
export async function GET() {
  try {
    const version = await getContentVersion(getDb());
    return Response.json(version, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch (error) {
    console.error("Content version read failed:", error);
    return jsonError("Không tải được phiên bản nội dung. Bạn thử lại sau nhé.", 503);
  }
}

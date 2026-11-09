import { getDb } from "@/server/db";
import { ADMIN_MESSAGES, contentListQuerySchema } from "@/server/admin/admin.schema";
import { listContent } from "@/server/admin/content.service";
import { error, json, readQuery, requireAdmin } from "@/server/admin/request";

// "Nội dung": one page of content items (feature 038, AC-013). Admins only.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const query = readQuery(request, contentListQuerySchema);
  if ("response" in query) return query.response;
  try {
    return json(await listContent(getDb(), query.data));
  } catch (cause) {
    console.error("Admin content list failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

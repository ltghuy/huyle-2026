import { getDb } from "@/server/db";
import { ADMIN_MESSAGES, overviewQuerySchema } from "@/server/admin/admin.schema";
import { getOverview } from "@/server/admin/overview.service";
import { error, json, readQuery, requireAdmin } from "@/server/admin/request";

// "Tổng quan" (feature 038, AC-006 to AC-008). Admins only; never cached.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const query = readQuery(request, overviewQuerySchema);
  if ("response" in query) return query.response;
  try {
    return json(await getOverview(getDb(), query.data.range, Date.now()));
  } catch (cause) {
    console.error("Admin overview failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

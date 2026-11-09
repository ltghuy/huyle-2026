import { getDb } from "@/server/db";
import { ADMIN_MESSAGES } from "@/server/admin/admin.schema";
import { listClaimGroups } from "@/server/admin/claims.service";
import { error, json, requireAdmin } from "@/server/admin/request";

// "Duyệt câu": pending claims, grouped (feature 038, AC-009). Admins only.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  try {
    return json({ groups: await listClaimGroups(getDb()) });
  } catch (cause) {
    console.error("Admin claims list failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

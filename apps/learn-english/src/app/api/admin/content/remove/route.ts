import { getDb } from "@/server/db";
import { ADMIN_MESSAGES, removeItemSchema } from "@/server/admin/admin.schema";
import { setContentRemoved } from "@/server/admin/content.service";
import { error, json, readBody, requireAdmin } from "@/server/admin/request";

// Removes an item, or restores a removed one (feature 038, AC-017).
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const body = await readBody(request, removeItemSchema);
  if ("response" in body) return body.response;
  try {
    const result = await setContentRemoved(getDb(), body.data.id, body.data.removed, Date.now());
    if (result.ok) return json({ ok: true });
    return result.reason === "read-only" ? error(ADMIN_MESSAGES.readOnly, 403) : error(ADMIN_MESSAGES.notFound, 404);
  } catch (cause) {
    console.error("Admin content remove failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

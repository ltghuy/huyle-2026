import { z } from "zod";
import { getDb } from "@/server/db";
import { ADMIN_MESSAGES, saveItemSchema } from "@/server/admin/admin.schema";
import { getContentItem, saveContentItem, type SaveResult } from "@/server/admin/content.service";
import { error, json, readBody, readQuery, requireAdmin } from "@/server/admin/request";

const idQuery = z.object({ id: z.string().min(1).max(200) });

const REFUSED: Record<Exclude<Extract<SaveResult, { ok: false }>["reason"], "invalid">, { message: string; status: number }> = {
  "read-only": { message: ADMIN_MESSAGES.readOnly, status: 403 },
  exists: { message: ADMIN_MESSAGES.exists, status: 409 },
  "not-found": { message: ADMIN_MESSAGES.notFound, status: 404 },
};

// One content item to edit (feature 038, AC-014).
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const query = readQuery(request, idQuery);
  if ("response" in query) return query.response;
  try {
    const item = await getContentItem(getDb(), query.data.id);
    return item ? json({ item }) : error(ADMIN_MESSAGES.notFound, 404);
  } catch (cause) {
    console.error("Admin content read failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

// Adds or replaces an item, live at once (AC-015, AC-016); 422 lists what is wrong in the body.
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const body = await readBody(request, saveItemSchema);
  if ("response" in body) return body.response;
  try {
    const result = await saveContentItem(getDb(), body.data, Date.now());
    if (result.ok) return json({ item: result.item });
    if (result.reason === "invalid") return error(ADMIN_MESSAGES.invalidItem, 422, result.issues);
    return error(REFUSED[result.reason].message, REFUSED[result.reason].status);
  } catch (cause) {
    console.error("Admin content save failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

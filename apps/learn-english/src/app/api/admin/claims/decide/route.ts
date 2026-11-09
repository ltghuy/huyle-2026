import { getDb } from "@/server/db";
import { ADMIN_MESSAGES, claimDecisionSchema } from "@/server/admin/admin.schema";
import { decideClaims } from "@/server/admin/claims.service";
import { error, json, readBody, requireAdmin } from "@/server/admin/request";

const REFUSED = {
  gone: "Câu này không còn trong khóa học, chỉ bỏ qua được thôi.",
  mixed: "Chỉ duyệt được từng nhóm một.",
} as const;

// Approves, rejects or drops one claim group (feature 038, AC-010 to AC-012).
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;
  const body = await readBody(request, claimDecisionSchema);
  if ("response" in body) return body.response;
  try {
    const result = await decideClaims(getDb(), body.data, Date.now());
    return result.ok ? json({ changed: result.changed }) : error(REFUSED[result.reason], 409);
  } catch (cause) {
    console.error("Admin claim decision failed:", cause);
    return error(ADMIN_MESSAGES.unavailable, 503);
  }
}

import { z } from "zod";
import { normalizeSyncCode } from "./code";

// Request and response shapes of /api/sync, shared with the sync client.
// The code travels only in this header, never in the URL, so it stays out of
// logs and browser history.
export const SYNC_CODE_HEADER = "x-sync-code";

/** The Vietnamese `error.message` of each /api/sync failure. */
export const SYNC_MESSAGES = {
  missingCode: "Thiếu mã đồng bộ.",
  invalidCode: "Mã đồng bộ không hợp lệ. Mã gồm 12 ký tự, dạng XXXX-XXXX-XXXX.",
  notFound: "Không tìm thấy mã đồng bộ này. Bạn kiểm tra lại mã nhé.",
  throttled: "Bạn đã nhập sai mã quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Dữ liệu đồng bộ không hợp lệ.",
  tooLarge: "Dữ liệu đồng bộ quá lớn (tối đa 1 MB).",
  conflict: "Tiến độ vừa được cập nhật từ thiết bị khác.",
  unavailable: "Máy chủ đồng bộ đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

/** The header value, normalised to its 12 characters; fails for a malformed code. */
export const syncCodeHeaderSchema = z
  .string()
  .transform((value, ctx) => {
    const code = normalizeSyncCode(value);
    if (code === null) {
      ctx.addIssue({ code: "custom", message: "Invalid sync code" });
      return z.NEVER;
    }
    return code;
  });

/** base64 of the gzipped snapshot; the server never decodes it beyond counting bytes. */
const payload = z.base64().min(1);

export const createSyncBodySchema = z.object({ data: payload });
export const updateSyncBodySchema = z.object({ rev: z.number().int().min(1), data: payload });

export type CreateSyncBody = z.infer<typeof createSyncBodySchema>;
export type UpdateSyncBody = z.infer<typeof updateSyncBodySchema>;

/** POST 201: the new code, formatted XXXX-XXXX-XXXX. */
export interface CreateSyncResponse {
  code: string;
  rev: 1;
}

/** GET 200. */
export interface GetSyncResponse {
  rev: number;
  data: string;
  updatedAt: number;
}

/** PUT 200. */
export interface UpdateSyncResponse {
  rev: number;
}

/** PUT 409: someone else wrote first; `rev` is the stored one. */
export interface SyncConflictResponse {
  error: { message: string };
  rev: number;
}

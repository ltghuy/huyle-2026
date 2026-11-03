import { z } from "zod";

// Request and response shapes of /api/progress (feature 022), shared with the sync client. The
// account comes from the session cookie; the body carries the same gzipped snapshot as sync codes.

/** The Vietnamese `error.message` of each /api/progress failure (401 and 503 come from the session check). */
export const PROGRESS_MESSAGES = {
  notFound: "Tài khoản chưa có tiến độ nào.",
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Dữ liệu tiến độ không hợp lệ.",
  tooLarge: "Dữ liệu tiến độ quá lớn (tối đa 1 MB).",
  conflict: "Tiến độ vừa được cập nhật từ thiết bị khác.",
  unavailable: "Máy chủ đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

export const putProgressBodySchema = z.object({
  /** The revision this device last read; 0 creates the account's first copy. */
  rev: z.number().int().min(0),
  /** base64 of the gzipped snapshot; the server never decodes it beyond counting bytes. */
  data: z.base64().min(1),
  /** This browser's random id, stored only hashed with the account id, to count devices (AC-027). */
  deviceId: z.string().regex(/^[0-9A-Za-z-]{8,64}$/),
  /** False when the learner turned off "Gửi thống kê ẩn danh" (AC-028). */
  countMe: z.boolean(),
});

export type PutProgressBody = z.infer<typeof putProgressBodySchema>;

/** GET 200. */
export interface GetProgressResponse {
  rev: number;
  data: string;
  updatedAt: number;
}

/** PUT 200. */
export interface PutProgressResponse {
  rev: number;
}

/** PUT 409: another device wrote first; `rev` is the stored one. */
export interface ProgressConflictResponse {
  error: { message: string };
  rev: number;
}

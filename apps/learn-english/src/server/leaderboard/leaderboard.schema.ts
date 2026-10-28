import { z } from "zod";
import { MAX_WEEK_POINTS, type BoardRow } from "@/learning/leaderboard";

// Request and response shapes of /api/leaderboard (feature 007), shared with
// the browser client. `token` is the entry's secret: only its SHA-256 is stored.

/** The Vietnamese `error.message` of each /api/leaderboard failure. */
export const LEADERBOARD_MESSAGES = {
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Dữ liệu bảng xếp hạng không hợp lệ.",
  forbidden: "Mục này trên bảng xếp hạng thuộc về thiết bị khác.",
  throttled: "Bạn gửi quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  unavailable: "Bảng xếp hạng đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

/** 32 random bytes, base64url without padding. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const id = z.uuid();
const token = z.string().regex(TOKEN_PATTERN);
const points = z.number().int().min(0).max(MAX_WEEK_POINTS);

export const submitBodySchema = z
  .object({
    id,
    token,
    // Checked with `checkBoardName` in the route; this only bounds the size.
    name: z.string().max(200),
    week: z.string().regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/),
    points,
    previousPoints: points,
  })
  .refine((body) => body.previousPoints <= body.points, { path: ["previousPoints"] });

export const removeBodySchema = z.object({ id, token });

export type SubmitBody = z.infer<typeof submitBodySchema>;
export type RemoveBody = z.infer<typeof removeBodySchema>;

/** POST 200: the learner's place this week, before and after this lesson, and the rows around them. */
export interface SubmitResponse {
  rank: number;
  previousRank: number;
  total: number;
  rows: BoardRow[];
}

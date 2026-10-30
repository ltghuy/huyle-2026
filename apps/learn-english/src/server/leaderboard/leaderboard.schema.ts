import { z } from "zod";
import { boardLimits, type BoardRow } from "@/learning/leaderboard";

// Request and response shapes of /api/leaderboard (feature 007, by streak since
// 013), shared with the browser client. `token` is the entry's secret: only its
// SHA-256 is stored.

/** The Vietnamese `error.message` of each /api/leaderboard failure. */
export const LEADERBOARD_MESSAGES = {
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Dữ liệu bảng xếp hạng không hợp lệ.",
  forbidden: "Mục này trên bảng xếp hạng thuộc về thiết bị khác.",
  implausible: "Chuỗi ngày học gửi lên không khớp với lần trước. Bạn đồng bộ tiến độ rồi thử lại nhé.",
  throttled: "Bạn gửi quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  unavailable: "Bảng xếp hạng đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

/** 32 random bytes, base64url without padding. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const id = z.uuid();
const token = z.string().regex(TOKEN_PATTERN);
const count = z.number().int().min(0);
const localDate = z.iso.date();

/**
 * After a daily lesson: the learner's local `today`, their last daily lesson,
 * and their streak and points ever earned now and before that lesson. The
 * route also checks `today` against the server's date; the service checks the
 * numbers against the entry's last report (AC-016).
 */
export const submitBodySchema = z
  .object({
    id,
    token,
    // Checked with `checkBoardName` in the route; this only bounds the size.
    name: z.string().max(200),
    today: localDate,
    lastDate: localDate,
    streak: count,
    earned: count,
    previousStreak: count,
    previousEarned: count,
  })
  .refine((body) => body.lastDate <= body.today, { path: ["lastDate"] })
  .refine((body) => body.previousStreak <= body.streak && body.previousEarned <= body.earned, { path: ["previousStreak"] })
  .refine((body) => body.streak <= boardLimits(body.lastDate).streak && body.earned <= boardLimits(body.lastDate).earned, { path: ["streak"] });

export const removeBodySchema = z.object({ id, token });

export type SubmitBody = z.infer<typeof submitBodySchema>;
export type RemoveBody = z.infer<typeof removeBodySchema>;

/** POST 200: the learner's place on the board, before and after this lesson, and the rows around them. */
export interface SubmitResponse {
  rank: number;
  previousRank: number;
  total: number;
  rows: BoardRow[];
}

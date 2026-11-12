// Request and response shapes of the admin routes (feature 038). No `server-only`:
// the admin page shares these types and messages.
import { z } from "zod";
import { CONTENT_KINDS, LEVELS_FOR_ADMIN, type ContentKind } from "./kinds";

export const ADMIN_MESSAGES = {
  forbidden: "Bạn không có quyền vào trang này.",
  invalidJson: "Dữ liệu gửi lên không đọc được.",
  invalidBody: "Dữ liệu gửi lên không hợp lệ.",
  invalidItem: "Mục nội dung chưa đúng. Bạn xem các lỗi bên dưới nhé.",
  tooLarge: "Dữ liệu gửi lên quá lớn.",
  notFound: "Không tìm thấy mục này.",
  exists: "Đã có mục với mã này.",
  readOnly: "Loại nội dung này chỉ xem được ở đây; hãy sửa bằng các script nội dung.",
  unavailable: "Trang quản trị đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

/** Content the admin page may change; placement items are generated and sets embed their words. */
export const READ_ONLY_KINDS: readonly ContentKind[] = ["placement", "set"];

export const OVERVIEW_RANGES = ["today", "week", "month"] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];
export const overviewQuerySchema = z.object({ range: z.enum(OVERVIEW_RANGES).default("today") });

export interface Windowed {
  today: number;
  week: number;
  month: number;
}

export interface AdminOverview {
  /** Server time, epoch ms. */
  now: number;
  range: OverviewRange;
  /** The first and last day (Vietnam time, YYYY-MM-DD) the range covers. */
  from: string;
  to: string;
  accounts: { total: number; created: Windowed; active: Windowed };
  pendingClaims: number;
  /** Devices that reported stats, per day, oldest first. */
  devices: { day: string; devices: number }[];
  lessons: number;
  placements: number;
  exercises: { kind: string; answered: number }[];
  wrongWords: { wordId: string; wrong: number }[];
  arenaMatches: number;
}

export const claimDecisionSchema = z
  .object({
    ids: z.array(z.string().min(1).max(100)).min(1).max(200),
    decision: z.enum(["approve", "reject", "drop"]),
    // A rejection's reason for the learner; on approve, why the wording is right, kept with it (feature 042, AC-003, AC-004).
    explanationVi: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.decision !== "reject" || Boolean(body.explanationVi), { message: "Cần lời giải thích khi từ chối.", path: ["explanationVi"] });
export type ClaimDecision = z.infer<typeof claimDecisionSchema>;

export interface AdminClaimGroup {
  /** `claimKey` of the sentence and wording. */
  key: string;
  ids: string[];
  sentenceId: string;
  answer: string;
  count: number;
  /** True when any claim in the group came from the learner's own AI grading. */
  ai: boolean;
  /** Why the AI accepted it: the first claim of the group that has a reason (feature 042, AC-002). */
  aiExplanationVi: string | null;
  firstAt: number;
  /** Null when the sentence is gone. */
  sentence: { vi: string; en: string; level: string } | null;
  /** Wordings the sentence already accepts, its own first. */
  accepted: string[];
}

export const contentListQuerySchema = z.object({
  kind: z.enum(CONTENT_KINDS).optional(),
  level: z.enum(LEVELS_FOR_ADMIN).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;
export const CONTENT_PAGE_SIZE = 50;

export interface AdminContentRow {
  id: string;
  kind: ContentKind;
  level: string;
  topic: string | null;
  sort: number;
  deleted: boolean;
  /** Epoch ms of the last admin edit not yet pulled into git; null when it matches the repo. */
  adminEditedAt: number | null;
  updatedVersion: number;
}

export interface AdminContentItem extends AdminContentRow {
  body: unknown;
}

export const saveItemSchema = z.object({
  create: z.boolean(),
  /** Validated against the content rules in the service, so the issues can point into the body. */
  item: z.object({ id: z.string().min(1).max(200), kind: z.enum(CONTENT_KINDS), level: z.enum(LEVELS_FOR_ADMIN), topic: z.string().max(100).nullish(), sort: z.number().int().default(0), body: z.unknown() }),
});
export type SaveItemBody = z.infer<typeof saveItemSchema>;

export const removeItemSchema = z.object({ id: z.string().min(1).max(200), removed: z.boolean() });

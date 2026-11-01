import { z } from "zod";

// Request and response shapes of /api/claims and /api/claims/status (feature
// 016), shared with the browser client. A claim says a translation marked
// wrong was right; the owner decides it later.

/** Claims one device can send per UTC day; later ones are refused. */
export const MAX_CLAIMS_PER_DAY = 30;
/** Claims in one POST /api/claims. */
export const MAX_CLAIMS_PER_REQUEST = 10;
/** Claim ids in one POST /api/claims/status. */
export const MAX_STATUS_IDS = 50;
/** Longest answer the server stores, in characters. */
export const MAX_ANSWER_LENGTH = 500;
/** Largest request body either route reads, in bytes. */
export const MAX_CLAIMS_BODY_BYTES = 8192;

/** The Vietnamese `error.message` of each claims failure. */
export const CLAIMS_MESSAGES = {
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Dữ liệu đề xuất đáp án không hợp lệ.",
  tooLarge: "Dữ liệu gửi lên quá lớn.",
  throttled: "Bạn gửi quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  unavailable: "Phần đề xuất đáp án đang gặp sự cố. Bạn thử lại sau nhé.",
} as const;

export const SENTENCE_ID_PATTERN = /^sentence:[a-z0-9][a-z0-9-]*$/;

export const CLAIM_STATUSES = ["pending", "approved", "rejected", "dropped"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

const claimSchema = z.object({
  id: z.uuid(),
  sentenceId: z.string().regex(SENTENCE_ID_PATTERN),
  answer: z.string().trim().min(1).max(MAX_ANSWER_LENGTH),
});

export const claimsRequestSchema = z.object({
  deviceId: z.uuid(),
  claims: z
    .array(claimSchema)
    .min(1)
    .max(MAX_CLAIMS_PER_REQUEST)
    .refine((list) => new Set(list.map((claim) => claim.id)).size === list.length, { message: "Duplicate claim id" }),
});

export const claimsResponseSchema = z.object({ accepted: z.array(z.string()) });

export const claimStatusRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(MAX_STATUS_IDS),
});

export const claimStatusSchema = z.object({
  id: z.string(),
  status: z.enum(CLAIM_STATUSES),
  explanationVi: z.string().optional(),
});

export const claimStatusResponseSchema = z.object({ claims: z.array(claimStatusSchema) });

export type ClaimsRequest = z.infer<typeof claimsRequestSchema>;
export type ClaimInput = ClaimsRequest["claims"][number];
/** POST /api/claims 200: the ids the server stored; refused ones are left out. */
export type ClaimsResponse = z.infer<typeof claimsResponseSchema>;
export type ClaimStatusRequest = z.infer<typeof claimStatusRequestSchema>;
export type ClaimStatusEntry = z.infer<typeof claimStatusSchema>;
/** POST /api/claims/status 200: the known claims; unknown ids are left out. */
export type ClaimStatusResponse = z.infer<typeof claimStatusResponseSchema>;

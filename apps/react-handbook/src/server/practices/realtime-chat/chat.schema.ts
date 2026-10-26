import { z } from "zod";

export const MAX_TEXT = 2000;
export const MAX_NAME = 32;
export const PAGE_SIZE = 30;
/** Messages the server keeps for history and reconnect replay. */
export const REPLAY_WINDOW = 500;

export const ACTIVITIES = ["off", "normal", "burst"] as const;
export type Activity = (typeof ACTIVITIES)[number];

const id = z.string().min(1).max(64);

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name can't be empty")
  .max(MAX_NAME, `Name must be at most ${MAX_NAME} characters`);

export const networkQuerySchema = z.object({
  /** -1 = random 100–2000 ms. */
  latencyMs: z.coerce.number().int().min(-1).max(10_000).default(0),
  failRate: z.coerce.number().min(0).max(1).default(0),
});

export const historyQuerySchema = networkQuerySchema.extend({
  before: z.coerce.number().int().positive().optional(),
});

export const streamQuerySchema = z.object({
  tabId: id,
  /** Last seq the client has; replay starts after it. */
  after: z.coerce.number().int().min(0).default(0),
});

export const sendBodySchema = z.object({
  clientId: id,
  authorId: id,
  authorName: displayNameSchema,
  text: z.string().trim().min(1, "Message can't be empty").max(MAX_TEXT),
});

export const typingBodySchema = z.object({
  authorId: id,
  authorName: displayNameSchema,
  typing: z.boolean(),
});

export const seenBodySchema = z.object({
  authorId: id,
  upToSeq: z.number().int().min(0),
});

export const controlBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("drop"), tabId: id }),
  z.object({ action: z.literal("activity"), value: z.enum(ACTIVITIES) }),
  z.object({ action: z.literal("clear"), authorId: id, authorName: displayNameSchema }),
]);

export type SendBody = z.infer<typeof sendBodySchema>;
export type ControlBody = z.infer<typeof controlBodySchema>;

export type ChatMessage = {
  /** `m{seq}` */
  id: string;
  /** Room-wide, strictly increasing, never reused. */
  seq: number;
  /** Sender's idempotency key. */
  clientId: string;
  /** Tab id, or `bot:{name}` for simulated participants. */
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type HistoryPage = {
  /** Ascending by seq. */
  messages: ChatMessage[];
  hasMore: boolean;
  /** True when older messages existed but fell out of the window. */
  trimmed: boolean;
};

export type TypingEvent = { authorId: string; authorName: string; typing: boolean };
export type SeenEvent = { authorId: string; upToSeq: number };
export type HelloEvent = { tabId: string; oldestSeq: number; newestSeq: number };
export type ResetEvent = { page: HistoryPage };
/** The room's history up to `upToSeq` was deleted by `byName`. */
export type ClearedEvent = { byId: string; byName: string; upToSeq: number };

export type StreamEvent =
  | { type: "hello"; data: HelloEvent }
  | { type: "message"; data: ChatMessage }
  | { type: "reset"; data: ResetEvent }
  | { type: "typing"; data: TypingEvent }
  | { type: "seen"; data: SeenEvent }
  | { type: "cleared"; data: ClearedEvent };

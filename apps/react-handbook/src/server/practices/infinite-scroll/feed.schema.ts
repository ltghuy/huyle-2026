import { z } from "zod";

export const PAGE_SIZES = [10, 20, 50] as const;

export const pageQuerySchema = z.object({
  cursor: z.string().max(64).optional(),
  limit: z.coerce
    .number()
    .int()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n), "limit must be 10, 20 or 50")
    .default(20),
  latencyMs: z.coerce.number().int().min(0).max(10_000).default(0),
  failRate: z.coerce.number().min(0).max(1).default(0),
});

export const newerQuerySchema = z.object({
  after: z.string().max(64),
});

export type PageQuery = z.infer<typeof pageQuerySchema>;

export type Post = {
  id: string;
  /** Higher is newer; never reused. */
  seq: number;
  author: string;
  handle: string;
  createdAt: string;
  text: string;
};

export type FeedPage = {
  data: Post[];
  /** Opaque marker for the next (older) page, or null at the end. */
  nextCursor: string | null;
  /** Marker for "newer than the top post"; only on the first page. */
  topCursor?: string;
  total: number;
};

export type NewerResult = {
  /** How many posts are newer than the given marker. */
  count: number;
  /** Up to 100 of the oldest newer posts, newest first. */
  posts: Post[];
  /** Marker for "newer than the newest post returned". */
  cursor: string;
};

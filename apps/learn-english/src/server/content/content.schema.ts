import { z } from "zod";
import { contentKindSchema, levelSchema, type ContentItem, type ContentKind } from "@/content/schema";

// Request and response shapes of the content API, shared by the route
// handlers and the content client (no `server-only` here).

/** Kinds whose items are always requested one level at a time. */
export const LEVELLED_KINDS = ["word", "sentence", "writing"] as const satisfies readonly ContentKind[];

export function requiresLevel(kind: ContentKind): boolean {
  return (LEVELLED_KINDS as readonly ContentKind[]).includes(kind);
}

// A non-negative integer written in the query string. `z.coerce.number()`
// would turn a missing or empty value into NaN/0, so match the digits first.
const versionParam = z
  .string({ error: "v là bắt buộc" })
  .regex(/^\d{1,15}$/, "v phải là số nguyên không âm")
  .transform(Number);

export const contentItemsQuerySchema = z
  .object({
    kind: contentKindSchema,
    level: levelSchema.optional(),
    v: versionParam,
  })
  .superRefine((query, ctx) => {
    if (!query.level && requiresLevel(query.kind)) {
      ctx.addIssue({ code: "custom", path: ["level"], message: `level là bắt buộc với kind=${query.kind}` });
    }
  });
export type ContentItemsQuery = z.infer<typeof contentItemsQuerySchema>;

/** Reads the query params the schema knows from a URL (absent params stay undefined). */
export function contentItemsQueryInput(searchParams: URLSearchParams) {
  return {
    kind: searchParams.get("kind") ?? undefined,
    level: searchParams.get("level") ?? undefined,
    v: searchParams.get("v") ?? undefined,
  };
}

export interface ContentVersion {
  /** 0 until the first publish. */
  version: number;
  /** Epoch ms of the last publish; 0 until the first publish. */
  publishedAt: number;
}

export interface ContentItemsResponse {
  version: number;
  /** Every live item of that kind (and level), by level, sort, then id. */
  items: ContentItem[];
  /** Ids removed from that kind/level; clients hide them but keep progress. */
  tombstones: string[];
}

/** Body of the 409 sent when `v` is not the current version. */
export interface StaleVersionResponse {
  error: { message: string };
  version: number;
}

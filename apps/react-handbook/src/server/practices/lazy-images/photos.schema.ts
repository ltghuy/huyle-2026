import { z } from "zod";

// Shared by the routes, the service and the client (no `server-only`).

/** Candidate widths every photo is offered in (`srcset` w descriptors). */
export const WIDTHS = [320, 640, 960, 1280] as const;
export type ImageWidth = (typeof WIDTHS)[number];

export const PHOTO_COUNTS = [24, 48, 96] as const;
export type PhotoCount = (typeof PHOTO_COUNTS)[number];

const oneOf = <T extends number>(values: readonly T[], label: string) =>
  z.coerce
    .number()
    .int()
    .refine((n): n is T => (values as readonly number[]).includes(n), `${label} must be one of ${values.join(", ")}`);

export const runIdSchema = z.string().regex(/^[a-z0-9]{6,24}$/, "Invalid run id");
export const photoIdSchema = z.string().regex(/^ph-\d{2}$/, "Invalid photo id");

export const photosQuerySchema = z.object({
  count: oneOf(PHOTO_COUNTS, "count").default(48),
  latencyMs: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const imageQuerySchema = z.object({
  w: oneOf(WIDTHS, "w"),
  run: runIdSchema,
  /** Attempt number; a retry changes it so the browser can't reuse a failure. */
  a: z.coerce.number().int().min(0).max(99).default(0),
});

export const runSettingsSchema = z.object({
  latencyMs: z.number().int().min(0).max(10_000),
  failRate: z.number().min(0).max(1),
});

export const runBodySchema = runSettingsSchema.extend({ run: runIdSchema });
export const runQuerySchema = z.object({ run: runIdSchema });

export type RunSettings = z.infer<typeof runSettingsSchema>;
export type RunBody = z.infer<typeof runBodySchema>;

export type Photo = {
  id: string;
  title: string;
  /** Text alternative describing the scene. */
  alt: string;
  /** Intrinsic size at the widest candidate; the ratio is what matters. */
  width: number;
  height: number;
  /** Dominant color (CSS hex) for the color placeholder. */
  color: string;
  /** Tiny SVG data URI for the blur-up placeholder. */
  preview: string;
};

/** What the server saw for one run. */
export type RunStats = {
  requests: number;
  served: number;
  failed: number;
  cancelled: number;
  /** Uncompressed body bytes served. */
  bytes: number;
  inFlight: number;
};

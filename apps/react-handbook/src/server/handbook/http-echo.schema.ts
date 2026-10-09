import { z } from "zod";

export const ECHO_STATUSES = [200, 201, 204, 301, 400, 401, 404, 429, 500, 503] as const;
export type EchoStatus = (typeof ECHO_STATUSES)[number];

export const echoParamsSchema = z.object({
  status: z.coerce
    .number()
    .refine((n): n is EchoStatus => (ECHO_STATUSES as readonly number[]).includes(n), "Unsupported status")
    .default(200),
  redirectedFrom: z.coerce.number().optional(),
});

export const MAX_ECHO_BODY = 2048;

export type EchoReceived = {
  method: string;
  url: string;
  headers: [string, string][];
  body: string | null;
};

export const cacheRules = ["no-store", "max-age", "etag"] as const;
export type CacheRule = (typeof cacheRules)[number];

export const cacheParamsSchema = z.object({
  rule: z.enum(cacheRules),
  run: z.string().regex(/^[a-z0-9-]{4,40}$/),
});

export const cacheLogParamsSchema = cacheParamsSchema.pick({ run: true });

export type CacheLogEntry = { n: number; rule: CacheRule; status: 200 | 304 };

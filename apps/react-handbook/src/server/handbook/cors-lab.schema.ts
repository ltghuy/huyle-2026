import { z } from "zod";

const flag = z.enum(["0", "1"]).transform((v) => v === "1");

export const corsParamsSchema = z.object({
  run: z.string().regex(/^[a-z0-9-]{4,40}$/),
  n: z.coerce.number().int().min(0).max(100000),
  allow: z.enum(["none", "any", "origin"]),
  put: flag,
  header: flag,
  credentials: flag,
});
export type CorsParams = z.infer<typeof corsParamsSchema>;

export const corsLogParamsSchema = corsParamsSchema.pick({ run: true });

export type CorsLogEntry = {
  n: number;
  method: string;
  origin: string | null;
  preflight: boolean;
  requestMethod: string | null;
  requestHeaders: string | null;
};

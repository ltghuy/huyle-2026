import { z } from "zod";

export const saveRequestSchema = z.object({
  latencyMs: z.number().int().min(0).max(10_000),
  failRate: z.number().min(0).max(1),
});

export type SaveRequest = z.infer<typeof saveRequestSchema>;

export type SaveResponse = { savedAt: string };

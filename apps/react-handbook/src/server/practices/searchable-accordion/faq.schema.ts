import { z } from "zod";

export const faqQuerySchema = z.object({
  size: z.enum(["normal", "large"]).default("normal"),
  latencyMs: z.coerce.number().int().min(0).max(10_000).default(0),
  failRate: z.coerce.number().min(0).max(1).default(0),
});

export type FaqQuery = z.infer<typeof faqQuerySchema>;

export type FaqEntry = {
  id: string;
  category: string;
  question: string;
  answer: string;
};

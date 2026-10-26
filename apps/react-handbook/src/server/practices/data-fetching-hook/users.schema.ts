import { z } from "zod";

export const networkQuerySchema = z.object({
  /** -1 = random 100–2000 ms. */
  latencyMs: z.coerce.number().int().min(-1).max(10_000).default(0),
  failRate: z.coerce.number().min(0).max(1).default(0),
});

export const patchUserSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    favorite: z.boolean().optional(),
  })
  .refine((body) => body.name !== undefined || body.favorite !== undefined, {
    message: "Nothing to update",
  });

export type PatchUser = z.infer<typeof patchUserSchema>;

export type UserSummary = {
  id: string;
  name: string;
  role: string;
  favorite: boolean;
};

export type UserDetail = UserSummary & {
  email: string;
  bio: string;
  updatedAt: string;
};

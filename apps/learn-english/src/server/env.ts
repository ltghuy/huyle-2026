import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const envSchema = z.object({
  // Salt for the daily device hash in usage stats.
  STATS_SALT: z.string().min(32),
  // Largest gzipped sync snapshot the server stores.
  SYNC_MAX_BYTES: z.coerce.number().int().positive().default(1_048_576),
});

export type Env = z.infer<typeof envSchema>;

// Secrets are read from the Cloudflare bindings (wrangler secrets in
// production, `.dev.vars` locally), never from `.env*` files: OpenNext inlines
// those into the Worker bundle at build time. Bindings exist only inside a
// request, so this is parsed lazily, once per request.
export const getEnv = cache((): Env => {
  const parsed = envSchema.safeParse(getCloudflareContext().env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
});

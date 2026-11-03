import "server-only";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const envSchema = z.object({
  // Salt for the daily device hash in usage stats.
  STATS_SALT: z.string().min(32),
  // Largest gzipped sync snapshot the server stores.
  SYNC_MAX_BYTES: z.coerce.number().int().positive().default(1_048_576),
  // Last day (UTC, inclusive) an old sync code can be merged into an account (feature 022, AC-020/021).
  // Unset means codes are still read as before.
  SYNC_CODES_UNTIL: z.iso.date().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Secrets are read from the Cloudflare bindings (wrangler secrets in
// production, `.dev.vars` locally), never from `.env*` files: OpenNext inlines
// those into the Worker bundle at build time. Bindings exist only inside a
// request, so this is parsed lazily, once per request.
export const getEnv = cache((): Env => parseBindings(envSchema));

// Google sign-in (feature 022). Kept apart from `envSchema` so the content, stats and other
// routes keep working where these secrets aren't set yet; only the auth code reads them.
const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export const getAuthEnv = cache((): AuthEnv => parseBindings(authEnvSchema));

function parseBindings<T extends z.ZodType>(schema: T): z.infer<T> {
  const parsed = schema.safeParse(getCloudflareContext().env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

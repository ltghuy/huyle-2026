import { defineConfig } from "drizzle-kit";

// Generates SQL migrations only; they are applied with
// `wrangler d1 migrations apply learn-english --local|--remote`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
});

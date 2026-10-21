import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees (git worktrees of this repo) live here.
    ".claude/**",
    // Cloudflare adapter build output (OpenNext + wrangler).
    ".open-next/**",
    ".wrangler/**",
    // Tests generated from the Gherkin features by playwright-bdd.
    ".features-gen/**",
  ]),
  {
    // Playwright fixtures call `use()`, which the React hooks rule mistakes for React's `use`.
    files: ["e2e/**/*.ts"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
]);

export default eslintConfig;

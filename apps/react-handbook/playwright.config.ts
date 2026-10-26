import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// End-to-end suite for this site. `pnpm test:e2e` turns the Gherkin features
// into tests (bddgen), builds the app, serves it on port 3100 and runs both the
// specs and the scenarios. The handbook reporter records each run for the
// Testing pages.
const PORT = 3100;

const scenarios = defineBddConfig({
  features: "e2e/features/*.feature",
  steps: ["e2e/steps/*.ts", "e2e/fixtures.ts"],
  importTestFrom: "e2e/fixtures.ts",
  outputDir: ".features-gen",
});

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["./e2e/reporters/handbook-reporter.ts"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", testDir: "./e2e/specs", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "scenarios", testDir: scenarios, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

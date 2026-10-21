import { defineConfig, devices } from "@playwright/test";

// End-to-end suite for this site. `pnpm test:e2e` builds the app, serves it on
// port 3100 and runs the specs in e2e/specs. The handbook reporter records each
// run for the "End-to-end testing with Playwright" page.
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e/specs",
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

// End-to-end suite. Runs against the Cloudflare build (`opennextjs-cloudflare
// preview`) rather than `next start`, so the D1 and rate-limit bindings exist.
// The database is a separate local state (.wrangler/e2e) seeded with the small
// fixture content set, so tests never touch content published locally.
// Port 3102 keeps it clear of the dev servers (3000–3002).
const PORT = 3102;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }, testIgnore: /\.mobile\.spec\.ts$/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /\.mobile\.spec\.ts$/ },
  ],
  webServer: {
    command: `pnpm e2e:seed && pnpm cf:build && pnpm exec opennextjs-cloudflare preview --port ${PORT} --persist-to .wrangler/e2e`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});

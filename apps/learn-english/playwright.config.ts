import { defineConfig, devices } from "@playwright/test";

// End-to-end suite. Runs against the Cloudflare build (`opennextjs-cloudflare
// preview`) rather than `next start`, so the D1 and rate-limit bindings exist.
// Port 3102 keeps it clear of the dev servers (3000–3002).
const PORT = 3102;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm cf:build && pnpm exec opennextjs-cloudflare preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Learners seeded by `e2e/fixtures/users.sql` (features 023, 031, 035, 039); keep in step with it. */
export const E2E_USERS = {
  minh: { id: "e2e-minh", name: "Minh Anh", token: "e2e-token-minh" },
  lan: { id: "e2e-lan", name: "Lan", token: "e2e-token-lan" },
  // Only the friends spec uses these two (feature 031).
  khoa: { id: "e2e-khoa", name: "Khoa", token: "e2e-token-khoa" },
  hoa: { id: "e2e-hoa", name: "Hoa", token: "e2e-token-hoa" },
  // Only the translate spec's AI grading tests use her (feature 033).
  thu: { id: "e2e-thu", name: "Thư", token: "e2e-token-thu" },
  // Only the challenge spec uses these two (feature 035).
  an: { id: "e2e-an", name: "An", token: "e2e-token-an" },
  binh: { id: "e2e-binh", name: "Bình", token: "e2e-token-binh" },
  // Only the team match spec uses these three (feature 039).
  tam: { id: "e2e-tam", name: "Tâm", token: "e2e-token-tam" },
  uyen: { id: "e2e-uyen", name: "Uyên", token: "e2e-token-uyen" },
  vy: { id: "e2e-vy", name: "Vy", token: "e2e-token-vy" },
  // Only the community spec uses these two (feature 041).
  quang: { id: "e2e-quang", name: "Quang", token: "e2e-token-quang" },
  phuong: { id: "e2e-phuong", name: "Phương", token: "e2e-token-phuong" },
} as const;

/** The preview's Better Auth secret: from the environment, else `.dev.vars` (which the preview reads). */
function authSecret(): string {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const line = readFileSync(join(__dirname, "..", ".dev.vars"), "utf8")
    .split("\n")
    .find((entry) => entry.startsWith("BETTER_AUTH_SECRET="));
  if (!line) throw new Error("BETTER_AUTH_SECRET is missing from .dev.vars");
  return line.slice("BETTER_AUTH_SECRET=".length).trim();
}

/**
 * Signs a browser context in as a seeded learner: sets Better Auth's session cookie the way it
 * signs it (token, ".", base64 HMAC-SHA256 of the token, URL-encoded). The preview serves http, so
 * the cookie has no `__Secure-` prefix.
 */
export async function signInAs(context: BrowserContext, user: (typeof E2E_USERS)[keyof typeof E2E_USERS], baseURL: string) {
  const signature = createHmac("sha256", authSecret()).update(user.token).digest("base64");
  await context.addCookies([
    { name: "better-auth.session_token", value: encodeURIComponent(`${user.token}.${signature}`), url: baseURL, httpOnly: true, sameSite: "Lax" },
  ]);
}

/** Fresh browser: skip the placement test and land on the home page. */
export async function skipPlacement(page: Page) {
  await page.goto("/");
  await page.waitForURL("**/placement");
  await page.getByRole("button", { name: "Bỏ qua, học từ trình độ A1" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

/** Dismisses the first-visit welcome dialog if it is showing. */
export async function skipWelcome(page: Page) {
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ timeout: 10_000 });
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  await expect(dialog).toBeHidden();
}

/**
 * Answers every step of the runner on screen (first option, any tiles, a
 * self-marked writing) until `doneText` appears. Correctness doesn't matter,
 * except in practice sets, which repeat wrong answers until they are right
 * (feature 006): the correct answer shown after a wrong one is remembered and
 * given in the retry round, which replays the wrong questions in order.
 */
export async function playThrough(page: Page, doneText: string | RegExp) {
  let wrongAnswers: string[] = [];
  let retryAnswers: string[] = [];
  for (let steps = 0; steps < 120; steps++) {
    if (await page.getByText(doneText).isVisible()) return;
    const retry = page.getByRole("button", { name: "Làm lại câu sai" });
    if (await retry.isVisible()) {
      retryAnswers = wrongAnswers;
      wrongAnswers = [];
      await retry.click();
      continue;
    }
    if (await page.getByRole("button", { name: "Đang lưu…" }).isVisible()) {
      await page.waitForTimeout(200);
      continue;
    }
    const next = page.getByRole("button", { name: "Tiếp tục" });
    if (await next.isVisible()) {
      if (await page.getByText("Chưa đúng", { exact: true }).isVisible()) {
        const expected = page.getByText("Đáp án:").locator('span[lang="en"]');
        if (await expected.count()) wrongAnswers.push((await expected.first().innerText()).trim());
      }
      await next.click();
      continue;
    }
    const known = retryAnswers[0];
    const radios = page.getByRole("radio");
    if (await radios.count()) {
      const match = known ? radios.filter({ hasText: known }) : radios;
      await ((await match.count()) ? match : radios).first().click();
    }
    const textbox = page.getByRole("textbox").first();
    if ((await textbox.isVisible()) && (await textbox.isEnabled())) {
      await textbox.fill(known ?? "test");
      const reveal = page.getByRole("button", { name: "Xem bài mẫu" });
      if (await reveal.isVisible()) {
        await reveal.click();
        await page.getByRole("button", { name: /Mình viết đúng/ }).click();
      }
    }
    const check = page.getByRole("button", { name: "Kiểm tra" });
    for (const label of ["Các từ để chọn", "Chữ cái để chọn"]) {
      for (let i = 0; i < 14; i++) {
        if (await check.isEnabled().catch(() => false)) break;
        const tile = page.getByLabel(label).locator("button:enabled").first();
        if (!(await tile.count())) break;
        await tile.click();
      }
    }
    if (await check.isEnabled().catch(() => false)) {
      await check.click();
      if (known !== undefined) retryAnswers.shift();
    } else await page.waitForTimeout(200);
  }
  throw new Error(`Never reached "${doneText}"`);
}

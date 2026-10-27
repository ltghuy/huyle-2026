import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { skipPlacement, skipWelcome } from "../helpers";

test("export progress, then import it into a fresh browser", async ({ page, browser }) => {
  await skipPlacement(page);
  await skipWelcome(page);

  // Some progress: mark one word learned (AC-009).
  await page.goto("/tu-vung");
  await page.locator('a[href*="tu=word"]').first().click();
  await page.getByRole("button", { name: "Đánh dấu đã học" }).click();
  await expect(page.getByRole("dialog")).toContainText("Đã học");

  // Export (AC-042).
  await page.goto("/cai-dat");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Xuất tiến độ" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^learn-english-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const snapshot = JSON.parse(await readFile(file, "utf8"));
  expect(snapshot.summary.wordsLearned).toBe(1);

  // Import into a new browser (AC-043).
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await skipPlacement(other);
  await skipWelcome(other);
  await other.goto("/cai-dat");
  await other.locator('input[type="file"]').setInputFiles(file);
  const confirm = other.getByRole("alertdialog");
  await expect(confirm).toContainText("1");
  await confirm.getByRole("button", { name: /Nhập|Thay/ }).click();
  // The learned word came across: its card shows the "Đã học" badge.
  await other.goto("/tu-vung");
  await expect(other.getByText("Đã học").first()).toBeVisible();
  await fresh.close();
});

test("a damaged backup file is rejected and nothing changes", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/cai-dat");
  await page.locator('input[type="file"]').setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{not json") });
  await expect(page.getByRole("alert").filter({ hasText: /không|hỏng|đọc/i })).toBeVisible();
});

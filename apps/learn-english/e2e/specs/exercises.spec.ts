import { expect, test } from "@playwright/test";
import { playThrough, skipPlacement, skipWelcome } from "../helpers";

test("an exercise set from the library ends with a score", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/bai-tap");
  await page.getByRole("button", { name: /Bắt đầu|Làm bài/ }).first().click();
  await playThrough(page, /\d+\/\d+ câu đúng|Kết quả|Làm lại/);
  await expect(page.getByRole("button", { name: "Làm lại" })).toBeVisible();
});

test("content still loads from the browser cache when the server is unreachable", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/tu-vung");
  await expect(page.locator('a[href*="tu=word"]').first()).toBeVisible();

  await page.route("**/api/content/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator('a[href*="tu=word"]').first()).toBeVisible();
});

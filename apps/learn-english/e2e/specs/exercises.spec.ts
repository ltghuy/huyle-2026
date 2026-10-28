import { expect, test } from "@playwright/test";
import { playThrough, skipPlacement, skipWelcome } from "../helpers";

test("an exercise set from the library ends with a score once every answer is right (006)", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/exercises");
  await page.getByRole("button", { name: /Bắt đầu|Làm bài/ }).first().click();
  await playThrough(page, "Hoàn thành bài tập");
  await expect(page.getByRole("button", { name: "Làm lại", exact: true })).toBeVisible();
});

test("content still loads from the browser cache when the server is unreachable", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/vocabulary");
  await expect(page.locator('a[href*="word=word"]').first()).toBeVisible();

  await page.route("**/api/content/**", (route) => route.abort());
  await page.reload();
  await expect(page.locator('a[href*="word=word"]').first()).toBeVisible();
});

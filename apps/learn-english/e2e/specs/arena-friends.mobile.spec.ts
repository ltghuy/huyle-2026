import { devices, expect, test } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Friends on a phone: no sidebar, so they have their own page reached from the Thêm sheet
// (feature 032, AC-001, AC-006), and the bell sits in the header (feature 031, AC-022).
test("on a phone, friends open from the Thêm sheet, not the Đấu trường page", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "vi-VN", reducedMotion: "reduce" });
  await signInAs(context, E2E_USERS.minh, baseURL!);
  const page = await context.newPage();

  await page.goto("/arena");
  await expect(page.getByRole("button", { name: /^Thông báo/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Bạn bè", exact: true })).toHaveCount(0);

  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("button", { name: "Thêm" }).click();
  await page.getByRole("dialog", { name: "Thêm" }).getByRole("link", { name: "Bạn bè" }).click();
  await expect(page).toHaveURL(/\/friends$/);
  await expect(page.getByRole("region", { name: "Bạn bè", exact: true })).toBeVisible({ timeout: 15_000 });
});

import { devices, expect, test } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 031 on a phone (AC-017, AC-022): no sidebar, so friends show on the Đấu trường page, and
// the bell sits in the header.
test("on a phone, friends show on the Đấu trường page and the bell in the header", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "vi-VN", reducedMotion: "reduce" });
  await signInAs(context, E2E_USERS.minh, baseURL!);
  const page = await context.newPage();
  await page.goto("/arena");
  await expect(page.getByRole("region", { name: "Bạn bè" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /^Thông báo/ })).toBeVisible();
});

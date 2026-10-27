import { expect, test } from "@playwright/test";

test("home page renders in Vietnamese", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { level: 1, name: "Bài học hôm nay" })).toBeVisible();
});

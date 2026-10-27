import { expect, test } from "@playwright/test";
import { enterName } from "../helpers";

test("static pages render in Vietnamese", async ({ page }) => {
  await page.goto("/credits");
  await enterName(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.getByRole("heading", { level: 1, name: "Nguồn dữ liệu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "CEFR-J Wordlist Version 1.5" })).toBeVisible();
});

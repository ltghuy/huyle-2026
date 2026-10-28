import { expect, test } from "@playwright/test";
import { playThrough, skipPlacement, skipWelcome } from "../helpers";

// Feature 008 against the fixture content: two A1 verbs, go (A–B–C) and eat (A–B–C).
test("irregular verbs: find a verb, open it, practise it until all correct, and see it in Hồ sơ", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);

  // From the menu (AC-001).
  await page.getByRole("link", { name: "Động từ bất quy tắc" }).first().click();
  await page.waitForURL("**/irregular-verbs");
  await expect(page.getByRole("status").filter({ hasText: "động từ" })).toHaveText("2 động từ");

  // Search a past form (AC-005), then a pattern with none (AC-004).
  await page.getByRole("searchbox", { name: "Tìm động từ" }).fill("went");
  await expect(page.getByRole("status").filter({ hasText: "động từ" })).toHaveText("1 động từ");
  await page.getByRole("searchbox", { name: "Tìm động từ" }).fill("");
  await page.getByRole("button", { name: /A – A – A/ }).click();
  await expect(page.getByText("Không tìm thấy động từ nào")).toBeVisible();
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();

  // Open a verb (AC-006).
  await page.getByRole("button", { name: "go", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("go – went – gone");
  await expect(dialog).toContainText("She has gone to the market.");

  // Practise it; wrong answers come back until all are right (AC-007, AC-011).
  await dialog.getByRole("button", { name: "Luyện động từ này" }).click();
  await playThrough(page, "Hoàn thành bài tập");
  await expect(page.getByRole("button", { name: "Làm lại", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Về danh sách động từ" }).click();

  // Its forms now count in Hồ sơ, apart from words (AC-016).
  await page.goto("/profile");
  await expect(page.getByRole("list", { name: "Động từ bất quy tắc đã học" })).toContainText("1/2 động từ");
});

test("a verb's word dialog links to its forms on the section (AC-013)", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/vocabulary?level=A1&word=word%3Ago-v");
  const link = page.getByRole("link", { name: /go – went – gone/ });
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL("**/irregular-verbs?verb=go-v");
  await expect(page.getByRole("dialog")).toContainText("go – went – gone");
});

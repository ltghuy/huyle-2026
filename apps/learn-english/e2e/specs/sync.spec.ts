import { expect, test } from "@playwright/test";
import { skipPlacement, skipWelcome } from "../helpers";

test("progress moves to another browser with a sync code, and later changes follow", async ({ page, browser }) => {
  // Device A: learn a word, turn sync on (AC-047).
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/vocabulary");
  await page.locator('a[href*="word=word"]').first().click();
  await page.getByRole("button", { name: "Đánh dấu đã học" }).click();
  // Wait until the card is saved before leaving the page.
  await expect(page.getByRole("dialog")).toContainText("Đã học");
  await page.keyboard.press("Escape");
  await page.goto("/settings");
  await page.getByRole("button", { name: /Bật đồng bộ/ }).click();
  await expect(page.getByLabel("Mã đồng bộ")).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  const code = (await page.getByLabel("Mã đồng bộ").innerText()).trim();

  // Device B: link with the code (AC-049).
  const other = await browser.newContext();
  const b = await other.newPage();
  await skipPlacement(b);
  await skipWelcome(b);
  await b.goto("/settings");
  await b.getByLabel("Nhập mã đồng bộ").fill(code.toLowerCase().replaceAll("-", ""));
  await b.getByRole("button", { name: /Kiểm tra mã/ }).click();
  const confirm = b.getByRole("alertdialog");
  await expect(confirm).toContainText("Liên kết với tiến độ này?");
  await confirm.getByRole("button", { name: /Liên kết/ }).click();
  await expect(b.getByLabel("Mã đồng bộ")).toHaveText(code);
  await b.goto("/vocabulary");
  await expect(b.getByText("Đã học").first()).toBeVisible();

  // A learns another word; B picks it up with "Đồng bộ ngay" on both sides (AC-048, AC-050).
  await page.goto("/vocabulary");
  await page.locator('a[href*="word=word"]').nth(1).click();
  await page.getByRole("button", { name: "Đánh dấu đã học" }).click();
  // Wait until the card is saved before leaving the page.
  await expect(page.getByRole("dialog")).toContainText("Đã học");
  await page.keyboard.press("Escape");
  await page.goto("/settings");
  await page.getByRole("button", { name: /Đồng bộ ngay/ }).click();
  await expect(page.getByText("Đã đồng bộ.")).toBeVisible();

  await b.goto("/settings");
  await b.getByRole("button", { name: /Đồng bộ ngay/ }).click();
  await expect(b.getByText("Đã đồng bộ.")).toBeVisible();
  await b.goto("/vocabulary");
  await expect(b.getByText(/Bạn đã học\s*2\/\d+/)).toBeVisible();
  await other.close();
});

import { expect, test, type Page } from "@playwright/test";
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

/** Marks the vocabulary list's words `from`…`from + count - 1` as learned. */
async function learnWords(page: Page, from: number, count: number) {
  await page.goto("/vocabulary");
  for (let i = from; i < from + count; i++) {
    await page.locator('a[href*="word=word"]').nth(i).click();
    await page.getByRole("button", { name: "Đánh dấu đã học" }).click();
    // Wait until the card is saved before closing.
    await expect(page.getByRole("dialog")).toContainText("Đã học");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  }
}

async function syncNow(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: /Đồng bộ ngay/ }).click();
  await expect(page.getByText("Đã đồng bộ.")).toBeVisible();
}

async function expectLearned(page: Page, count: number) {
  await page.goto("/vocabulary");
  await expect(page.getByText(new RegExp(`Bạn đã học\\s*${count}/\\d+`))).toBeVisible();
}

test("both devices keep learning and each picks up the other's words (quick 021)", async ({ page: a, browser }) => {
  // A learns 3 words and turns sync on.
  await skipPlacement(a);
  await skipWelcome(a);
  await learnWords(a, 0, 3);
  await a.goto("/settings");
  await a.getByRole("button", { name: /Bật đồng bộ/ }).click();
  await expect(a.getByLabel("Mã đồng bộ")).toHaveText(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  const code = (await a.getByLabel("Mã đồng bộ").innerText()).trim();

  // B links with the code and has the same 3.
  const context = await browser.newContext();
  const b = await context.newPage();
  await skipPlacement(b);
  await skipWelcome(b);
  await b.goto("/settings");
  await b.getByLabel("Nhập mã đồng bộ").fill(code);
  await b.getByRole("button", { name: /Kiểm tra mã/ }).click();
  await b.getByRole("alertdialog").getByRole("button", { name: /Liên kết/ }).click();
  await expect(b.getByLabel("Mã đồng bộ")).toHaveText(code);
  await expectLearned(b, 3);

  // B learns 2 more (5); A syncs and has 5.
  await learnWords(b, 3, 2);
  await syncNow(b);
  await syncNow(a);
  await expectLearned(a, 5);

  // A learns 1 more (6); B syncs and has 6.
  await learnWords(a, 5, 1);
  await syncNow(a);
  await syncNow(b);
  await expectLearned(b, 6);
  await context.close();
});

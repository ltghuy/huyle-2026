import { expect, test, type Page } from "@playwright/test";
import { skipPlacement, skipWelcome } from "../helpers";

// Translate a sentence (feature 016) in the exercise library. The e2e content
// has an approved wording for "Tôi có quả táo." ("I've got an apple."), in
// scripts/fixtures/content/wording/A1-claims.json.

async function openTranslateSet(page: Page) {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.goto("/exercises?level=A1&type=translate");
  await page.getByRole("button", { name: /Bắt đầu/ }).first().click();
  await expect(page.getByText("Dịch câu sau sang tiếng Anh")).toBeVisible();
}

const prompt = (page: Page) => page.locator("main p.text-xl");
const answerBox = (page: Page) => page.getByRole("textbox", { name: "Câu tiếng Anh của bạn" });

test("a wrong translation can be claimed as correct, and the session goes on (016 AC-006, AC-007)", async ({ page }) => {
  await openTranslateSet(page);
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/claims") && response.request().method() === "POST");

  await answerBox(page).fill("This is my own wording");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Chưa đúng")).toBeVisible();
  await page.getByRole("button", { name: "Câu của mình cũng đúng" }).click();
  await expect(page.getByText("Đã tính là đúng")).toBeVisible();

  const response = await sent;
  expect(response.status()).toBe(200);
  expect((await response.json()).accepted).toHaveLength(1);

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(answerBox(page)).toBeEnabled();
  await expect(answerBox(page)).toHaveValue("");
});

test("an approved wording is accepted straight away (016 AC-004, AC-012)", async ({ page }) => {
  await openTranslateSet(page);
  // A run draws 10 of the level's sentences, so new rounds ("Làm lại") are
  // started until the apple sentence comes up. Other steps are claimed, so no
  // retry round starts.
  for (let step = 0; step < 60; step++) {
    const done = page.getByText("Hoàn thành bài tập");
    await expect(answerBox(page).or(done)).toBeVisible();
    if (await done.isVisible()) await page.getByRole("button", { name: "Làm lại", exact: true }).click();
    await expect(answerBox(page)).toBeEnabled();
    await expect(answerBox(page)).toHaveValue("");
    const vi = (await prompt(page).textContent())?.trim();
    if (vi === "Tôi có quả táo.") {
      await answerBox(page).fill("I've got an apple");
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      await expect(page.getByText("Chính xác!")).toBeVisible();
      return;
    }
    await answerBox(page).fill("x");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByRole("button", { name: "Câu của mình cũng đúng" }).click();
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await expect(page.getByText("Đã tính là đúng")).toBeHidden();
  }
  throw new Error("the apple sentence never came up");
});

import { expect, type Page } from "@playwright/test";

/** Fresh browser: skip the placement test and land on the home page. */
export async function skipPlacement(page: Page) {
  await page.goto("/");
  await page.waitForURL("**/kiem-tra-trinh-do");
  await page.getByRole("button", { name: "Bỏ qua, học từ trình độ A1" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

/** Dismisses the first-visit welcome dialog if it is showing. */
export async function skipWelcome(page: Page) {
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ timeout: 10_000 });
  await dialog.getByRole("button", { name: "Bỏ qua" }).click();
  await expect(dialog).toBeHidden();
}

/**
 * Answers every step of the runner on screen (first option, any tiles, a
 * self-marked writing) until `doneText` appears. Correctness doesn't matter.
 */
export async function playThrough(page: Page, doneText: string | RegExp) {
  for (let steps = 0; steps < 80; steps++) {
    if (await page.getByText(doneText).isVisible()) return;
    if (await page.getByRole("button", { name: "Đang lưu…" }).isVisible()) {
      await page.waitForTimeout(200);
      continue;
    }
    const next = page.getByRole("button", { name: "Tiếp tục" });
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    const radios = page.getByRole("radio");
    if (await radios.count()) await radios.first().click();
    const textbox = page.getByRole("textbox").first();
    if ((await textbox.isVisible()) && (await textbox.isEnabled())) {
      await textbox.fill("test");
      const reveal = page.getByRole("button", { name: "Xem bài mẫu" });
      if (await reveal.isVisible()) {
        await reveal.click();
        await page.getByRole("button", { name: /Mình viết đúng/ }).click();
      }
    }
    const check = page.getByRole("button", { name: "Kiểm tra" });
    for (const label of ["Các từ để chọn", "Chữ cái để chọn"]) {
      for (let i = 0; i < 14; i++) {
        if (await check.isEnabled().catch(() => false)) break;
        const tile = page.getByLabel(label).locator("button:enabled").first();
        if (!(await tile.count())) break;
        await tile.click();
      }
    }
    if (await check.isEnabled().catch(() => false)) await check.click();
    else await page.waitForTimeout(200);
  }
  throw new Error(`Never reached "${doneText}"`);
}

import { expect, test } from "@playwright/test";
import { skipPlacement } from "../helpers";

test("on a phone, tour steps for menu items point at the More button", async ({ page }) => {
  await skipPlacement(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "Xem hướng dẫn" }).click();
  await expect(page.getByRole("dialog")).toContainText("Bài học hôm nay");
  await page.getByRole("button", { name: "Bước tiếp theo" }).click(); // Chuỗi ngày và điểm: on the home page
  await page.getByRole("button", { name: "Bước tiếp theo" }).click(); // Từ vựng: in the bottom bar
  await page.getByRole("button", { name: "Bước tiếp theo" }).click(); // Ngữ pháp: behind "Thêm"
  const step = page.getByRole("dialog");
  await expect(step).toContainText("Ngữ pháp");
  await expect(step).toBeInViewport();
  await page.getByRole("button", { name: "Đóng hướng dẫn" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

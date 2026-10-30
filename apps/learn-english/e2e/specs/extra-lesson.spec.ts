import { expect, test } from "@playwright/test";
import { playThrough, skipPlacement, skipWelcome } from "../helpers";

test("after today's lesson, points buy an extra lesson that costs more the next time (013)", async ({ page }) => {
  await skipPlacement(page);
  await skipWelcome(page);
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await page.waitForURL("**/lesson");
  await playThrough(page, "Hoàn thành bài hôm nay!");
  await expect(page.getByText("+20 điểm chuyên cần")).toBeVisible();
  await page.getByRole("dialog", { name: "Tham gia bảng xếp hạng?" }).getByRole("button", { name: "Không, cảm ơn" }).click();
  await page.getByRole("link", { name: "Về trang chính" }).click();

  // AC-003, AC-004: price and balance on the home page, then a confirmation.
  await expect(page.getByText("Dùng điểm để học thêm từ mới hôm nay. Bạn đang có 20 điểm.")).toBeVisible();
  await page.getByRole("button", { name: "Học thêm một bài · 10 điểm" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Dùng 10 điểm để học thêm?" });
  await expect(confirm).toContainText("bài tiếp theo hôm nay giá 13 điểm");
  await confirm.getByRole("button", { name: "Dùng 10 điểm" }).click();
  await page.waitForURL("**/extra-lesson");

  // AC-008: finishing awards nothing and shows no board.
  await playThrough(page, "Hoàn thành bài học thêm!");
  await expect(page.getByText(/điểm chuyên cần/)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Về trang chính" }).click();

  // AC-002: 10 points left. The fixtures' 13 A1 words are all learned now, so nothing more is for sale
  // (the 13-point price and the disabled button are covered by the card's component test).
  await expect(page.getByText("Điểm hiện có").locator("..")).toContainText("10");
  await expect(page.getByText("Bạn đã học hết từ mới ở trình độ này. Hẹn gặp lại bạn ngày mai.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Học thêm một bài/ })).toHaveCount(0);
});

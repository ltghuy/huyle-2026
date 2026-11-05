import { expect, test } from "@playwright/test";
import { playThrough, skipPlacement } from "../helpers";

test("first visit: placement, welcome and tour, then today's lesson awards points once", async ({ page }) => {
  await skipPlacement(page);

  // Welcome dialog (AC-038) with no name asked for (quick 051) and tour with keyboard (AC-039).
  const welcome = page.getByRole("alertdialog");
  await expect(welcome).toContainText("Chào mừng bạn");
  await welcome.getByRole("button", { name: "Xem hướng dẫn" }).click();
  const step = page.getByRole("dialog");
  await expect(step).toContainText("Bài học hôm nay");
  await expect(step).toContainText("1/12");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog")).toContainText("Chuỗi ngày và điểm");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog")).toContainText("1/12");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  // Shown once (AC-040).
  await page.reload();
  await expect(page.getByRole("link", { name: "Bắt đầu" })).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // Today's lesson (AC-014, AC-015).
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await page.waitForURL("**/lesson");
  await playThrough(page, "Hoàn thành bài hôm nay!");
  await expect(page.getByText("+20 điểm chuyên cần")).toBeVisible();

  // The board (feature 007, by streak since 013): asked once after the lesson; joining sends the streak.
  const consent = page.getByRole("dialog", { name: "Tham gia bảng xếp hạng?" });
  await expect(consent.getByLabel("Tên hiện trên bảng")).toHaveValue("Minh Anh");
  await consent.getByRole("button", { name: "Tham gia" }).click();
  const board = page.getByRole("dialog", { name: "Bảng xếp hạng chuỗi ngày học" });
  await expect(board.getByRole("listitem").filter({ hasText: "Minh Anh" })).toContainText("1 ngày");
  await board.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(board).toBeHidden();

  await page.getByRole("link", { name: "Về trang chính" }).click();
  await expect(page.getByText("Bạn đã học xong hôm nay")).toBeVisible();
  await expect(page.getByText("1 ngày")).toBeVisible();

  // Coming back to the finished lesson never awards a second time.
  await page.goto("/lesson");
  await expect(page.getByText("Điểm hôm nay đã được cộng rồi.")).toBeVisible();
});

test("a lesson left halfway resumes at the same step", async ({ page }) => {
  await skipPlacement(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "Bỏ qua" }).click();
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await page.waitForURL("**/lesson");
  // A new word's study card, then its multiple-choice check: the counter reads 3/N.
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText(/^3\/\d+$/)).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Học tiếp" })).toBeVisible();
  await page.getByRole("link", { name: "Học tiếp" }).click();
  await expect(page.getByText(/^3\/\d+$/)).toBeVisible();
});

test("a fresh browser starts the placement test without being asked for a name (quick 051)", async ({ page }) => {
  await page.goto("/placement");
  await expect(page.getByRole("button", { name: "Bỏ qua, học từ trình độ A1" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Bạn tên là gì?" })).toHaveCount(0);
});

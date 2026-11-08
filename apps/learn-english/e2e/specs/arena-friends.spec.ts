import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 031 on the Cloudflare preview: Khoa sends Hoa a friend request from their match history
// while Hoa is away; Hoa comes back, sees it in the bell and accepts; both see each other online
// in the sidebar; Khoa's bell says Hoa accepted; Khoa removes Hoa.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

test("a request sent from match history waits in the bell until the friend comes back", async ({ browser, baseURL }) => {
  const khoa = await signedIn(browser, E2E_USERS.khoa, baseURL!);
  // A previous run against a reused server may have left them friends: start clean.
  await khoa.request.post("/api/social/friends/remove", { data: { userId: E2E_USERS.hoa.id } });

  await khoa.goto("/arena/history");
  await khoa.getByRole("button", { name: /với Hoa/ }).click();
  const details = khoa.getByRole("dialog");
  await details.getByRole("button", { name: "Kết bạn" }).click();
  await expect(details.getByRole("button", { name: "Đã gửi lời mời" })).toBeDisabled();
  await khoa.keyboard.press("Escape");

  // Hoa opens the app later: the bell shows the waiting request (AC-004, AC-026).
  const hoa = await signedIn(browser, E2E_USERS.hoa, baseURL!);
  await hoa.goto("/arena");
  const bell = hoa.getByRole("button", { name: "Thông báo, 1 chưa đọc" });
  await expect(bell).toBeVisible({ timeout: 15_000 });
  await bell.click();
  const panel = hoa.getByRole("dialog");
  await expect(panel.getByText("Khoa muốn kết bạn với bạn")).toBeVisible();
  await panel.getByRole("button", { name: "Đồng ý" }).click();
  await expect(panel.getByText("Bạn và Khoa đã là bạn bè")).toBeVisible();
  await hoa.keyboard.press("Escape");

  // Both sidebars list the other as online (AC-010, AC-012).
  const hoaFriends = hoa.getByRole("region", { name: "Bạn bè" });
  await expect(hoaFriends.getByText("Khoa")).toBeVisible({ timeout: 15_000 });
  await khoa.reload();
  const khoaFriends = khoa.getByRole("region", { name: "Bạn bè" });
  await expect(khoaFriends.getByText("Hoa")).toBeVisible({ timeout: 15_000 });
  await expect(khoaFriends.getByText("Đang trực tuyến", { exact: true })).toBeVisible();
  await expect(khoaFriends.getByText("1/1 đang trực tuyến")).toBeVisible();

  // Khoa's bell says Hoa accepted (AC-028).
  await khoa.getByRole("button", { name: "Thông báo, 1 chưa đọc" }).click();
  await expect(khoa.getByRole("dialog").getByText("Hoa đã đồng ý kết bạn")).toBeVisible();
  await khoa.keyboard.press("Escape");

  // Khoa removes Hoa; both lists empty (AC-020).
  await khoaFriends.getByRole("button", { name: "Tùy chọn cho Hoa" }).click();
  await khoa.getByRole("menuitem", { name: "Xóa bạn" }).click();
  await khoa.getByRole("alertdialog").getByRole("button", { name: "Xóa bạn" }).click();
  await expect(khoaFriends.getByText("Bạn chưa có bạn bè nào.")).toBeVisible();
  await hoa.reload();
  await expect(hoa.getByRole("region", { name: "Bạn bè" }).getByText("Bạn chưa có bạn bè nào.")).toBeVisible({ timeout: 15_000 });
});

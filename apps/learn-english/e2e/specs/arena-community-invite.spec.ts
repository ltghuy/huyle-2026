import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 045 on the Cloudflare preview: Giang opens Cộng đồng, finds no room, makes a 1-1 room
// from there and invites Hiếu, who is online but not her friend. Hiếu accepts and is seated.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];
const { giang: GIANG, hieu: HIEU } = E2E_USERS;

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

test("a host from Cộng đồng invites an online learner who isn't a friend", async ({ browser, baseURL }) => {
  const giang = await signedIn(browser, GIANG, baseURL!);
  const hieu = await signedIn(browser, HIEU, baseURL!);
  // Not friends, even on a reused server.
  await giang.request.post("/api/social/friends/remove", { data: { userId: HIEU.id } });

  // Hiếu is on the home page with his link open, and his pulse marks him online.
  const linked = hieu.waitForEvent("websocket", { predicate: (socket) => socket.url().endsWith("/api/arena/link/socket"), timeout: 15_000 });
  await hieu.goto("/");
  await linked;

  // A filter no other spec publishes to, so the empty state (and its create links) shows.
  await giang.goto("/arena/community?kind=duel&level=C1");
  await giang.getByRole("link", { name: "Tạo phòng 1-1" }).click();
  await giang.waitForURL("**/arena/1v1?from=community");
  await giang.getByRole("button", { name: "A2" }).click();
  await giang.getByRole("radio", { name: /1 hiệp/ }).check();
  const create = giang.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await giang.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
  const code = new URL(giang.url()).searchParams.get("code")!;

  // AC-002, AC-003: the online list, and the invite reaches Hiếu.
  const online = giang.getByRole("region", { name: "Đang trực tuyến" });
  await online.getByRole("button", { name: "Mời Hiếu" }).click({ timeout: 15_000 });
  await expect(online.getByText(/Đang chờ/)).toBeVisible();
  const toast = hieu.getByRole("alertdialog", { name: "Giang thách đấu bạn!" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Chấp nhận" }).click();

  // AC-004: accepted, Hiếu is seated, and the list goes with the free seat.
  await hieu.waitForURL(`**/arena/room?code=${code}`);
  await expect(giang.getByText("Hiếu đã nhận lời, đang vào phòng!")).toBeVisible();
  await expect(online).toBeHidden({ timeout: 15_000 });
});

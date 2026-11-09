import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 035 on the Cloudflare preview: An hosts a room and challenges her friend Bình from the
// waiting room. Bình is first busy in a room of his own, then declines, then accepts and lands in
// An's room as her opponent.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];
const { an: AN, binh: BINH } = E2E_USERS;

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

/** Opens `path` and waits until the tab's link socket is up, so challenges can reach it. */
async function openWithLink(page: Page, path: string) {
  const linked = page.waitForEvent("websocket", { predicate: (socket) => socket.url().endsWith("/api/arena/link/socket"), timeout: 15_000 });
  await page.goto(path);
  await linked;
}

/** A 1-round room at A2 from the hub's "Đấu 1-1"; returns its code. */
async function createRoom(page: Page): Promise<string> {
  await page.goto("/arena");
  await page.getByRole("link", { name: "Đấu 1-1" }).click();
  await page.waitForURL("**/arena/1v1");
  await page.getByRole("button", { name: "A2" }).click();
  await page.getByRole("radio", { name: /1 hiệp/ }).check();
  const create = page.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await page.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
  return new URL(page.url()).searchParams.get("code")!;
}

test("a host challenges an online friend: busy, declined, then accepted", async ({ browser, baseURL }) => {
  const an = await signedIn(browser, AN, baseURL!);
  const binh = await signedIn(browser, BINH, baseURL!);
  // Friends from a clean start (a reused server may still have them as friends).
  await an.request.post("/api/social/friends/remove", { data: { userId: BINH.id } });
  await an.request.post("/api/social/requests", { data: { userId: BINH.id } });
  await binh.request.post("/api/social/requests/respond", { data: { userId: AN.id, accept: true } });

  // Bình is on the home page, so his pulse has marked him online before An's room loads.
  await openWithLink(binh, "/");
  const code = await createRoom(an);
  const friends = an.getByRole("region", { name: "Thách đấu bạn bè" });
  const challenge = friends.getByRole("button", { name: "Thách đấu Bình" });
  await expect(challenge).toBeVisible({ timeout: 15_000 });

  // Busy: Bình has a room of his own open in another tab (AC-007).
  const binhRoom = await binh.context().newPage();
  await createRoom(binhRoom);
  await expect(binhRoom.getByText("Mã phòng")).toBeVisible();
  await challenge.click();
  await expect(an.getByText("Bình đang ở một phòng đấu khác.")).toBeVisible();
  await expect(binh.getByText("An thách đấu bạn!")).toHaveCount(0);
  await binhRoom.close();

  // Declined (AC-003, AC-004, AC-006).
  await challenge.click();
  await expect(friends.getByText(/Đang chờ/)).toBeVisible();
  const toast = binh.getByRole("alertdialog", { name: "An thách đấu bạn!" });
  await expect(toast).toBeVisible();
  await toast.getByRole("button", { name: "Từ chối" }).click();
  await expect(toast).toBeHidden();
  await expect(an.getByText("Bình đã từ chối lời thách đấu.")).toBeVisible();

  // Accepted: Bình joins as An's opponent (AC-005).
  await challenge.click();
  await binh.getByRole("alertdialog", { name: "An thách đấu bạn!" }).getByRole("button", { name: "Chấp nhận" }).click();
  await binh.waitForURL(`**/arena/room?code=${code}`);
  await expect(an.getByText("Bình đã nhận lời, đang vào phòng!")).toBeVisible();
  await expect(an.getByRole("region", { name: "Thách đấu bạn bè" })).toBeHidden({ timeout: 15_000 });
  await expect(binh.getByText("An").first()).toBeVisible();

  await an.request.post("/api/social/friends/remove", { data: { userId: BINH.id } });
});

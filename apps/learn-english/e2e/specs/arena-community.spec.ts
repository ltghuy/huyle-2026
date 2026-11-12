import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 041: "Cộng đồng" on the Cloudflare preview (real Worker, Durable Object and D1). A host
// makes a waiting 1-1 room public, a learner who isn't their friend finds it in the community list
// and joins it with no code, and the room leaves the list once its seat is taken. Own accounts, so
// the other Arena specs can run in parallel.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

async function createDuel(page: Page): Promise<string> {
  await page.goto("/arena");
  await page.getByRole("link", { name: "Đấu 1-1" }).click();
  await page.waitForURL("**/arena/1v1");
  await page.getByRole("button", { name: "A2" }).click();
  await page.getByRole("radio", { name: /^Nghe/ }).check({ force: true });
  await page.getByRole("radio", { name: /1 hiệp/ }).check();
  const create = page.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await page.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
  return new URL(page.url()).searchParams.get("code")!;
}

test.describe("Arena community", () => {
  test("a public room is found and joined from Cộng đồng, then leaves the list (AC-001–AC-011)", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const quang = await signedIn(browser, E2E_USERS.quang, baseURL!);
    const phuong = await signedIn(browser, E2E_USERS.phuong, baseURL!);

    await createDuel(quang);
    await quang.getByRole("button", { name: "Công khai lên Cộng đồng" }).click();
    await expect(quang.getByText(/Phòng đang hiện trên Cộng đồng/)).toBeVisible({ timeout: 10_000 });

    // Phương opens Cộng đồng from the hub, every level shown.
    await phuong.goto("/arena");
    await phuong.getByRole("link", { name: "Cộng đồng" }).click();
    await phuong.waitForURL("**/arena/community");
    await phuong.goto("/arena/community?level=all");
    const row = phuong.getByRole("listitem").filter({ hasText: "Quang" });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText("Đấu 1-1");
    await expect(row).toContainText("A2 · 1 hiệp");
    await expect(row).toContainText("1/2");

    await row.getByRole("button", { name: "Vào phòng của Quang" }).click();
    await phuong.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
    await expect(phuong.getByText("Quang")).toBeVisible({ timeout: 15_000 });
    await expect(quang.getByText("Phương")).toBeVisible({ timeout: 15_000 });

    // The seat is taken: the room is gone from the list (AC-003).
    const list = (await (await phuong.request.get("/api/arena/community")).json()) as { rooms: { host: { name: string } }[] };
    expect(list.rooms.some((room) => room.host.name === "Quang")).toBe(false);
  });
});

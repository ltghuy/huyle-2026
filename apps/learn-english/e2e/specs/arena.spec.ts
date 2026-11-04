import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_USERS, enterName, signInAs } from "../helpers";

// Feature 023: live duels between two signed-in learners on the Cloudflare preview (real Worker,
// Durable Object and D1). Rooms use "Nghe" at A2, the e2e Arena content, so a pick ends a question
// at once. The browser never knows the answer before the reveal, so the tests check that both
// screens agree rather than steering who wins.

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function signedIn(browser: Browser, user: User, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ baseURL, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", reducedMotion: "reduce" });
  await signInAs(context, user, baseURL);
  return context.newPage();
}

async function stats(page: Page) {
  return (await (await page.request.get("/api/arena/stats")).json()) as { wins: number; losses: number };
}

/** Creates a 1-round "Nghe" room at A2 from the hub's "Đấu 1-1" and returns its code. */
async function createRoom(page: Page): Promise<string> {
  await page.goto("/arena");
  await page.getByRole("link", { name: "Đấu 1-1" }).click();
  await page.waitForURL("**/arena/1v1");
  await page.getByRole("button", { name: "A2" }).click();
  await page.getByRole("radio", { name: /^Nghe/ }).check({ force: true });
  await page.getByRole("button", { name: /1 hiệp/ }).click();
  const create = page.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await page.waitForURL(/\/arena\/room\?code=[A-Z2-9]{6}$/);
  return new URL(page.url()).searchParams.get("code")!;
}

async function bothReady(minh: Page, lan: Page) {
  await expect(minh.getByText("Lan").first()).toBeVisible({ timeout: 15_000 });
  await minh.getByRole("button", { name: "Sẵn sàng" }).click();
  await lan.getByRole("button", { name: "Sẵn sàng" }).click();
}

const openOption = (page: Page) => page.locator('[role="radio"]:not([disabled])');
const reveal = (page: Page) => page.getByRole("region", { name: "Đáp án" });
const matchTitle = (page: Page) => page.locator("#match-title");

/** Waits for the next open question or the end of the match. */
async function next(page: Page): Promise<"question" | "end"> {
  return Promise.race([
    openOption(page).first().waitFor({ timeout: 40_000 }).then(() => "question" as const),
    matchTitle(page).waitFor({ timeout: 40_000 }).then(() => "end" as const),
  ]);
}

test.describe("Arena duels", () => {
  test("two learners play a match; both screens agree on every point and the result is recorded (AC-004, AC-007–AC-023, AC-029)", async ({ browser, baseURL }) => {
    test.setTimeout(240_000);
    const minh = await signedIn(browser, E2E_USERS.minh, baseURL!);
    const lan = await signedIn(browser, E2E_USERS.lan, baseURL!);
    const before = { minh: await stats(minh), lan: await stats(lan) };

    const code = await createRoom(minh);
    await expect(minh.getByText("Đang chờ đối thủ", { exact: false })).toBeVisible();
    await lan.goto(`/arena/room?code=${code}`);
    await expect(lan.getByText("Minh Anh")).toBeVisible({ timeout: 15_000 });
    await expect(minh.getByRole("timer")).toBeVisible();
    await bothReady(minh, lan);

    // Question 1: nobody answers; both see the answer when time runs out (AC-017, AC-018).
    await expect(minh.getByText("Câu 1/12")).toBeVisible({ timeout: 10_000 });
    await expect(lan.getByText("Câu 1/12")).toBeVisible();
    await expect(reveal(minh).getByText("Hết giờ, không ai đúng")).toBeVisible({ timeout: 20_000 });
    await expect(reveal(lan).getByText("Hết giờ, không ai đúng")).toBeVisible();

    // Then Minh picks the first option and Lan the second, so each question ends at once.
    const latencies: number[] = [];
    let questions = 1;
    while ((await next(minh)) === "question") {
      questions++;
      await openOption(lan).first().waitFor();
      const sentAt = Date.now();
      await openOption(minh).first().click();
      const minhFirst = reveal(lan).getByText("Minh Anh nhanh hơn");
      const shown = await minhFirst.waitFor({ timeout: 1_500 }).then(
        () => true,
        () => false,
      );
      if (shown) latencies.push(Date.now() - sentAt);
      else if ((await openOption(lan).count()) > 0) await openOption(lan).nth(1).click();

      // Both screens tell the same story about this question (AC-016).
      await expect(reveal(minh)).toBeVisible();
      await expect(reveal(lan)).toBeVisible();
      const minhSaw = await reveal(minh).locator("p").first().innerText();
      const lanSaw = await reveal(lan).locator("p").first().innerText();
      if (minhSaw.startsWith("Bạn nhanh hơn")) expect(lanSaw).toContain("Minh Anh nhanh hơn");
      else if (minhSaw.startsWith("Lan nhanh hơn")) expect(lanSaw).toContain("Bạn nhanh hơn");
      else expect(lanSaw).toContain("Hết giờ, không ai đúng");
      expect(questions).toBeLessThanOrEqual(15);
    }

    // The match ends the same way on both screens (AC-022), and only the stats change (AC-023, AC-029).
    const minhTitle = await matchTitle(minh).innerText();
    await expect(matchTitle(lan)).toBeVisible();
    const lanTitle = await matchTitle(lan).innerText();
    const minhWon = minhTitle === "Bạn thắng!";
    expect(minhWon ? lanTitle : minhTitle).toBe(minhWon ? "Minh Anh thắng" : "Lan thắng");
    if (!minhWon) expect(lanTitle).toBe("Bạn thắng!");
    const after = { minh: await stats(minh), lan: await stats(lan) };
    expect(after.minh.wins - before.minh.wins).toBe(minhWon ? 1 : 0);
    expect(after.minh.losses - before.minh.losses).toBe(minhWon ? 0 : 1);
    expect(after.lan.wins - before.lan.wins).toBe(minhWon ? 0 : 1);

    // A correct answer reaches the other screen within a second (success criterion).
    test.info().annotations.push({ type: "reveal latency (ms)", description: latencies.join(", ") || "Minh never picked first and right" });
    console.log(`Arena reveal latency (ms): ${latencies.join(", ") || "none measured"}; questions: ${questions}`);
    for (const latency of latencies) expect(latency).toBeLessThan(1_000);

    // The record shows on Hồ sơ (AC-030).
    await minh.goto("/profile");
    await expect(minh.getByRole("heading", { name: "Thành tích đấu" })).toBeVisible();
    await expect(minh.getByText("Chuỗi thắng dài nhất")).toBeVisible();
  });

  test("a player who drops is waited for and the question restarts; leaving mid-match is a loss (AC-024, AC-025)", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const minh = await signedIn(browser, E2E_USERS.minh, baseURL!);
    const lan = await signedIn(browser, E2E_USERS.lan, baseURL!);
    const code = await createRoom(minh);
    await lan.goto(`/arena/room?code=${code}`);
    await bothReady(minh, lan);
    await expect(openOption(minh).first()).toBeVisible({ timeout: 10_000 });

    await lan.goto("about:blank");
    await expect(minh.getByText("Đang chờ Lan kết nối lại…")).toBeVisible({ timeout: 10_000 });
    await lan.goto(`/arena/room?code=${code}`);
    await expect(minh.getByText("Đang chờ Lan kết nối lại…")).toBeHidden({ timeout: 15_000 });
    await expect(openOption(minh)).toHaveCount(4);
    await expect(openOption(lan)).toHaveCount(4);

    await minh.getByRole("button", { name: /Rời trận/ }).click();
    await minh.getByRole("alertdialog").getByRole("button", { name: "Rời trận" }).click();
    await minh.waitForURL("**/arena");
    await expect(matchTitle(lan)).toHaveText("Minh Anh đã rời trận, bạn thắng", { timeout: 10_000 });
  });

  test("a player who doesn't come back in 30 s loses the match (AC-026)", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const minh = await signedIn(browser, E2E_USERS.minh, baseURL!);
    const lan = await signedIn(browser, E2E_USERS.lan, baseURL!);
    const code = await createRoom(minh);
    await lan.goto(`/arena/room?code=${code}`);
    await bothReady(minh, lan);
    await expect(openOption(minh).first()).toBeVisible({ timeout: 10_000 });

    await lan.goto("about:blank");
    await expect(minh.getByText("Đang chờ Lan kết nối lại…")).toBeVisible({ timeout: 10_000 });
    await expect(matchTitle(minh)).toHaveText("Lan đã rời trận, bạn thắng", { timeout: 45_000 });
  });

  test("guests are asked to sign in and come back to the same room (AC-006)", async ({ page }) => {
    await page.goto("/arena/room?code=K7P2QX");
    // A guest is asked their name first (feature 003).
    await enterName(page);
    await expect(page.getByText("Đăng nhập để vào Đấu trường")).toBeVisible();
    await expect(page).toHaveURL(/\/arena\/room\?code=K7P2QX$/);
    await expect(page.getByRole("button", { name: "Đăng nhập với Google" })).toBeVisible();
  });
});

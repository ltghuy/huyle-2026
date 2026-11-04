import { expect, test } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 023 T002: e2e can sign in seeded learners, two at once, without Google.
test.describe("e2e sign-in", () => {
  test("a seeded learner is signed in and sees their profile", async ({ context, page, baseURL }) => {
    await signInAs(context, E2E_USERS.minh, baseURL!);

    const session = await page.request.get("/api/auth/get-session");
    expect(session.ok()).toBe(true);
    expect((await session.json())?.user).toMatchObject({ id: E2E_USERS.minh.id, name: E2E_USERS.minh.name });

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "Chuỗi ngày học của bạn" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Đăng nhập để xem hồ sơ")).toBeHidden();
  });

  test("two browser contexts are signed in as different learners", async ({ browser, baseURL }) => {
    const first = await browser.newContext({ baseURL });
    const second = await browser.newContext({ baseURL });
    await signInAs(first, E2E_USERS.minh, baseURL!);
    await signInAs(second, E2E_USERS.lan, baseURL!);

    const [minh, lan] = await Promise.all([first.request.get("/api/auth/get-session"), second.request.get("/api/auth/get-session")]);
    expect((await minh.json())?.user?.id).toBe(E2E_USERS.minh.id);
    expect((await lan.json())?.user?.id).toBe(E2E_USERS.lan.id);

    await Promise.all([first.close(), second.close()]);
  });

  test("a guest has no session", async ({ page }) => {
    const session = await page.request.get("/api/auth/get-session");
    expect(await session.json()).toBeNull();
  });
});

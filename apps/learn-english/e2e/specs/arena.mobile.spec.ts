import { devices, expect, test } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 023 on a phone: create a room, and join it by typing the code into the hub.
test("on a phone, a room is created and joined by its code", async ({ browser, baseURL }) => {
  const open = async (user: (typeof E2E_USERS)[keyof typeof E2E_USERS]) => {
    const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "vi-VN", reducedMotion: "reduce" });
    await signInAs(context, user, baseURL!);
    return context.newPage();
  };
  const minh = await open(E2E_USERS.minh);
  const lan = await open(E2E_USERS.lan);

  await minh.goto("/arena");
  await minh.getByRole("button", { name: "Tạo phòng" }).click();
  const dialog = minh.getByRole("dialog", { name: "Tạo phòng đấu" });
  await dialog.getByRole("button", { name: "A2" }).click();
  const create = dialog.getByRole("button", { name: "Tạo phòng" });
  await expect(create).toBeEnabled({ timeout: 15_000 });
  await create.click();
  await minh.waitForURL(/\/arena\/room\?code=/);
  const code = new URL(minh.url()).searchParams.get("code")!;
  await expect(minh.getByRole("button", { name: "Sao chép liên kết" })).toBeInViewport();

  await lan.goto("/arena");
  await lan.getByLabel("Vào phòng bằng mã").fill(code.toLowerCase());
  await lan.getByRole("button", { name: "Vào phòng" }).click();
  await lan.waitForURL(`**/arena/room?code=${code}`);
  await expect(lan.getByText("Minh Anh")).toBeVisible({ timeout: 15_000 });
  await expect(minh.getByText("Lan")).toBeVisible();
  await expect(lan.getByRole("button", { name: "Sẵn sàng" })).toBeInViewport();
});

import { expect, test } from "../fixtures";

test.describe("Toast notifications", () => {
  test("a toast waits while the pointer is over it", async ({ toastPage, page }) => {
    await toastPage.setDuration(1);
    await toastPage.show("Success");
    const toast = toastPage.notifications.toast("Changes saved");
    await expect(toast).toBeVisible();

    await toast.hover();
    await page.clock.runFor(3000);
    await expect(toast).toBeVisible();

    await page.mouse.move(0, 0);
    await page.clock.runFor(3000);
    await expect(toast).toBeHidden();
  });

  test("an error toast stays until it is dismissed", async ({ toastPage, page }) => {
    await toastPage.show("Error");
    const toast = toastPage.notifications.toast("Payment declined");

    await page.clock.runFor(20_000);
    await expect(toast).toBeVisible();

    await toastPage.notifications.dismiss("Payment declined");
    await expect(toast).toBeHidden();
  });
});

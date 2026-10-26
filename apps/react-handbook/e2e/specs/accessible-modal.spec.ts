import { expect, test } from "../fixtures";

test.describe("Accessible modal", () => {
  test("focus moves into the dialog, stays there, and returns to the opener", async ({ modalPage, page }) => {
    await modalPage.editProfile.click();
    const dialog = modalPage.dialog("Edit profile");

    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Name")).toBeFocused();

    // Tab past the last control: focus wraps instead of leaving the dialog.
    await modalPage.pressTab(8);
    await expect(dialog.locator(":focus")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(modalPage.editProfile).toBeFocused();
  });

  test("a delete confirmation starts on Cancel and keeps the project", async ({ modalPage, page }) => {
    await modalPage.deleteButton("Mobile app").click();
    const confirm = modalPage.confirmation(/^Delete “Mobile app”\?$/);

    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(confirm).toBeHidden();
    await expect(modalPage.deleteButton("Mobile app")).toBeFocused();
  });
});

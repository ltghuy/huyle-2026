import type { Locator, Page } from "@playwright/test";

export class AccessibleModalPage {
  readonly editProfile: Locator;

  constructor(private readonly page: Page) {
    this.editProfile = page.getByRole("button", { name: "Edit profile" });
  }

  async goto() {
    await this.page.goto("/react-practices/accessible-modal");
  }

  /** Dialogs are portalled to the end of the body, so look for them on the whole page. */
  dialog(title: string) {
    return this.page.getByRole("dialog", { name: title });
  }

  confirmation(title: RegExp) {
    return this.page.getByRole("alertdialog", { name: title });
  }

  deleteButton(project: string) {
    return this.page.getByRole("button", { name: `Delete ${project}`, exact: true });
  }

  async pressTab(times: number) {
    for (let i = 0; i < times; i++) await this.page.keyboard.press("Tab");
  }
}

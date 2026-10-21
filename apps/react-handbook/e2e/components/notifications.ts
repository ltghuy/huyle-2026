import type { Locator, Page } from "@playwright/test";

/** The toast region, mounted once for the whole site; any page's toasts show up here. */
export class Notifications {
  readonly region: Locator;

  constructor(page: Page) {
    this.region = page.getByRole("region", { name: "Notifications (F8)" });
  }

  /** A toast's accessible name starts with its type, e.g. "Success: Changes saved". */
  toast(title: string) {
    return this.region.getByRole("group", { name: new RegExp(title) });
  }

  async dismiss(title: string) {
    await this.toast(title).getByRole("button", { name: "Dismiss notification" }).click();
  }
}

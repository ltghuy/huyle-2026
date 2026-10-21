import type { Page } from "@playwright/test";

import { DemoControls } from "../components/demo-controls";
import { Notifications } from "../components/notifications";

export class ToastPage {
  readonly controls: DemoControls;
  readonly notifications: Notifications;

  constructor(private readonly page: Page) {
    this.controls = new DemoControls(page);
    this.notifications = new Notifications(page);
  }

  async goto() {
    await this.page.goto("/react-practices/toast-notifications");
  }

  async setDuration(seconds: number) {
    await this.controls.setSlider(/^Duration/, seconds);
  }

  /** The trigger buttons sit in the controls panel; "Dismiss all" also exists in the toast region. */
  async show(button: "Success" | "Error" | "Info" | "Warning") {
    await this.controls.root.getByRole("button", { name: button, exact: true }).click();
  }
}

import type { Locator, Page } from "@playwright/test";

/** The "Demo controls" panel every practice page has: sliders and selects with visible labels. */
export class DemoControls {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole("region", { name: "Demo controls" });
  }

  /** Slider labels include their current value ("Server latency: 300 ms"), so match the start. */
  async setSlider(label: RegExp, value: number) {
    await this.root.getByLabel(label).fill(String(value));
  }

  async choose(label: string, option: string) {
    await this.root.getByLabel(label, { exact: true }).selectOption({ label: option });
  }
}

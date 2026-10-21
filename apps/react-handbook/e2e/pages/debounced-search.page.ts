import type { Locator, Page } from "@playwright/test";

import { DemoControls } from "../components/demo-controls";

export class DebouncedSearchPage {
  readonly controls: DemoControls;
  readonly searchBox: Locator;
  readonly techniques: Locator;
  readonly staleBanner: Locator;
  readonly timeline: Locator;

  constructor(private readonly page: Page) {
    this.controls = new DemoControls(page);
    this.searchBox = page.getByRole("combobox", { name: "Search products" });
    this.techniques = page.getByRole("region", { name: "Techniques" });
    this.staleBanner = page.getByText("Stale results.");
    this.timeline = page.getByRole("list", { name: "Search events, newest first" });
  }

  async goto() {
    await this.page.goto("/react-practices/debounced-search");
  }

  /** No random extra latency, and shorter queries answer later: the replies arrive in a known order. */
  async makeShortQueriesSlow() {
    await this.controls.setSlider(/^Random extra/, 0);
    await this.controls.setSlider(/^Server latency/, 100);
    await this.controls.choose("Latency mode", "Shorter queries slower");
  }

  async turnEverythingOff() {
    await this.techniques.getByRole("button", { name: "All off (naive)" }).click();
  }

  async turnOn(technique: "Debounce" | "Cache" | "Abort older requests" | "Stale-response guard") {
    await this.techniques.getByRole("checkbox", { name: new RegExp(`^${technique}`) }).check();
  }

  async type(text: string) {
    await this.searchBox.pressSequentially(text, { delay: 30 });
  }

  /** The list is named after the query its results are for. */
  resultsFor(query: string) {
    return this.page.getByRole("listbox", { name: `Results for ${query}`, exact: true });
  }
}

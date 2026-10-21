import type { BrowserContext, Locator, Page } from "@playwright/test";

export type Variant = "A" | "B";

export class AbTestingPage {
  readonly experiment: Locator;

  constructor(private readonly page: Page) {
    this.experiment = page.getByRole("region", { name: /sticky split/ });
  }

  async goto() {
    await this.page.goto("/testing/ab-testing");
  }

  /** Tests pin a variant with a cookie instead of getting a random one. */
  async pinVariant(context: BrowserContext, baseURL: string, variant: Variant) {
    await context.addCookies([{ name: "rp-ab-force", value: variant, url: baseURL }]);
  }

  buyButton(label: string) {
    return this.experiment.getByRole("button", { name: label, exact: true });
  }

  /** The "Variant" row of the assignment, e.g. "B (Buy now)". */
  get assignedVariant() {
    return this.experiment.getByText(/^(A|B) \((Add to cart|Buy now)\)/);
  }

  get visitorId() {
    return this.experiment.getByText(/^[0-9a-f-]{36}$/);
  }
}

import type { Locator, Page } from "@playwright/test";

export class CartPage {
  readonly discountCode: Locator;
  readonly apply: Locator;

  constructor(private readonly page: Page) {
    this.discountCode = page.getByLabel("Discount code");
    this.apply = page.getByRole("button", { name: "Apply", exact: true });
  }

  async goto() {
    await this.page.goto("/react-practices/context-reducer");
  }

  async add(product: string, quantity: number) {
    await this.page.getByRole("button", { name: `Add ${product} to cart` }).click();
    const qty = this.page.getByRole("textbox", { name: `Quantity of ${product}` });
    await qty.fill(String(quantity));
    await qty.press("Enter");
  }

  async applyCode(code: string) {
    await this.discountCode.fill(code);
    await this.apply.click();
  }

  /** A row of the totals list ("Subtotal", "Discount", "Shipping", "Total"). */
  total(row: string) {
    return this.page.getByRole("term").filter({ hasText: new RegExp(`^${row}$`) }).locator("xpath=following-sibling::dd[1]");
  }

  /** The discount form's error, linked to the field. */
  get codeProblem() {
    return this.discountCode;
  }
}

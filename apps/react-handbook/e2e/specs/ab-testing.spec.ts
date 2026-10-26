import { expect, test } from "@playwright/test";

import { AbTestingPage, type Variant } from "../pages/ab-testing.page";

const LABELS: Record<Variant, string> = { A: "Add to cart", B: "Buy now" };

test.describe("A/B testing", () => {
  // Pin each variant: a test that gets a random one checks a different page on every run.
  for (const variant of ["A", "B"] as const) {
    test(`variant ${variant} renders "${LABELS[variant]}"`, async ({ page, context, baseURL }) => {
      const ab = new AbTestingPage(page);
      await ab.pinVariant(context, baseURL!, variant);
      await ab.goto();

      await expect(ab.buyButton(LABELS[variant])).toBeVisible();
      await expect(ab.assignedVariant).toHaveText(new RegExp(`^${variant} \\(${LABELS[variant]}\\)`));
    });
  }

  test("a returning visitor keeps their id and variant", async ({ page }) => {
    const ab = new AbTestingPage(page);
    await ab.goto();
    const id = await ab.visitorId.textContent();
    const variant = await ab.assignedVariant.textContent();

    await page.reload();

    await expect(ab.visitorId).toHaveText(id!);
    await expect(ab.assignedVariant).toHaveText(variant!);
  });
});

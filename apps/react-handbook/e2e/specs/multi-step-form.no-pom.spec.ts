import { expect, test } from "@playwright/test";

// The same tests as multi-step-form.spec.ts, written without page objects,
// for the comparison on the handbook page.

test.describe("Multi-step form (no page objects)", () => {
  test("Next on an empty step shows each error on its field", async ({ page }) => {
    await page.goto("/react-practices/multi-step-form");
    await page.getByRole("region", { name: "Demo controls" }).getByLabel(/^Server latency/).fill("0");

    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByRole("heading", { name: /problems? on this step/ })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email", { exact: true })).toHaveAccessibleDescription(/Enter your email address/);
    await expect(page.getByRole("heading", { level: 2, name: /Personal details/ })).toBeVisible();
  });

  test("Back keeps the answers", async ({ page }) => {
    await page.goto("/react-practices/multi-step-form");
    await page.getByRole("region", { name: "Demo controls" }).getByLabel(/^Server latency/).fill("0");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Country you live in").selectOption({ label: "United Kingdom" });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Role/ })).toBeVisible();

    await page.getByRole("button", { name: "Back", exact: true }).click();

    await expect(page.getByRole("heading", { level: 2, name: /Personal details/ })).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveValue("Ada Lovelace");
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("ada@example.com");
  });

  test("a step that isn't open yet sends you to the first unfinished one", async ({ page }) => {
    await page.goto("/react-practices/multi-step-form?step=review");

    await expect(page.getByRole("heading", { level: 2, name: /Personal details/ })).toBeVisible();
  });
});

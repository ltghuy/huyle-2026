import { expect, test } from "../fixtures";

const ADA = { name: "Ada Lovelace", email: "ada@example.com", country: "United Kingdom" };

test.describe("Multi-step form", () => {
  test("Next on an empty step shows each error on its field", async ({ formPage }) => {
    await formPage.next.click();

    await expect(formPage.errorSummary).toBeVisible();
    await expect(formPage.fullName).toHaveAttribute("aria-invalid", "true");
    await expect(formPage.email).toHaveAccessibleDescription(/Enter your email address/);
    await expect(formPage.step("Personal details")).toBeVisible();
  });

  test("Back keeps the answers", async ({ formPage }) => {
    await formPage.fillPersonal(ADA);
    await formPage.next.click();
    await expect(formPage.step("Role")).toBeVisible();

    await formPage.back.click();

    await expect(formPage.step("Personal details")).toBeVisible();
    await expect(formPage.fullName).toHaveValue(ADA.name);
    await expect(formPage.email).toHaveValue(ADA.email);
  });

  test("a step that isn't open yet sends you to the first unfinished one", async ({ formPage }) => {
    await formPage.goto("review");

    await expect(formPage.step("Personal details")).toBeVisible();
  });
});

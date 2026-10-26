import { createBdd } from "playwright-bdd";

import { expect, test } from "../fixtures";

const { Given, When, Then } = createBdd(test);

Given("the shop is open with an empty cart", async ({ cartPage }) => {
  await expect(cartPage.discountCode).toBeVisible();
});

Given("my cart has {int} {string}", async ({ cartPage }, quantity: number, product: string) => {
  await cartPage.add(product, quantity);
});

When("I apply the code {string}", async ({ cartPage }, code: string) => {
  await cartPage.applyCode(code);
});

Then("the total is {string}", async ({ cartPage }, total: string) => {
  await expect(cartPage.total("Total")).toHaveText(total);
});

Then("I am told {string}", async ({ cartPage }, message: string) => {
  await expect(cartPage.codeProblem).toHaveAccessibleDescription(message);
});

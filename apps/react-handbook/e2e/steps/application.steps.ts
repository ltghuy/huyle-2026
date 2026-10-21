import { createBdd } from "playwright-bdd";

import { expect, test } from "../fixtures";

const { Given, When, Then } = createBdd(test);

const ADA = { name: "Ada Lovelace", email: "ada@example.com", country: "United Kingdom" };

Given("I am on the first step of the application", async ({ formPage }) => {
  await expect(formPage.step("Personal details")).toBeVisible();
});

Given("I have filled in my personal details", async ({ formPage }) => {
  await formPage.fillPersonal(ADA);
});

Given("I have filled in my personal details with the email {string}", async ({ formPage }, email: string) => {
  await formPage.fillPersonal({ ...ADA, email });
});

When("I continue", async ({ formPage }) => {
  await formPage.next.click();
});

When("I continue without answering", async ({ formPage }) => {
  await formPage.next.click();
});

When("I go back", async ({ formPage }) => {
  await expect(formPage.step("Role")).toBeVisible();
  await formPage.back.click();
});

Then("{string} is marked as needing an answer", async ({ formPage }, label: string) => {
  await expect(formPage.field(label)).toHaveAttribute("aria-invalid", "true");
});

Then("I am still on the {string} step", async ({ formPage }, title: string) => {
  await expect(formPage.step(title)).toBeVisible();
});

Then("the email is turned down with {string}", async ({ formPage }, problem: string) => {
  await expect(formPage.email).toHaveAccessibleDescription(new RegExp(problem));
});

Then("my personal details are still filled in", async ({ formPage }) => {
  await expect(formPage.fullName).toHaveValue(ADA.name);
  await expect(formPage.email).toHaveValue(ADA.email);
});

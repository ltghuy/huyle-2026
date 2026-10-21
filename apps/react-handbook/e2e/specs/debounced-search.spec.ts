import { expect, test } from "../fixtures";

test.describe("Debounced search", () => {
  test("without a guard, a late reply for an older query replaces newer results", async ({ searchPage }) => {
    await searchPage.turnEverythingOff();
    await searchPage.makeShortQueriesSlow();

    await searchPage.type("walnut");

    // "wa" was asked first but answers last, so its results win.
    await expect(searchPage.staleBanner).toBeVisible();
    await expect(searchPage.resultsFor("wa")).toBeVisible();
  });

  test("the stale-response guard keeps the newest results", async ({ searchPage }) => {
    await searchPage.turnEverythingOff();
    await searchPage.turnOn("Stale-response guard");
    await searchPage.makeShortQueriesSlow();

    await searchPage.type("walnut");

    await expect(searchPage.resultsFor("walnut")).toBeVisible();
    await expect(searchPage.timeline.getByText("Stale, dropped").first()).toBeVisible();
    await expect(searchPage.staleBanner).toBeHidden();
    await expect(searchPage.resultsFor("walnut")).toBeVisible();
  });
});

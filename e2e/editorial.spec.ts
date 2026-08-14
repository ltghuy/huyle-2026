import { test, expect, type Page } from "@playwright/test";

/**
 * Navigate and wait until the first-visit intro overlay has revealed the site.
 * During the intro, `#site-content` is `visibility:hidden` (removed from the a11y
 * tree), so assertions on hero content must wait for it to finish. Skips the
 * intro (a keypress triggers its fast-forward) and resolves once it's gone.
 */
async function gotoReady(page: Page, path = "/") {
  await page.goto(path);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForFunction(
    () =>
      (window as unknown as { __introComplete?: boolean }).__introComplete === true ||
      !document.querySelector('[role="img"][aria-label="Evan"]'),
    null,
    { timeout: 15_000 },
  );
}

test.describe("editorial re-style (feature 002)", () => {
  test("the #hero anchor is a real, reachable destination", async ({ page }) => {
    await gotoReady(page, "/#hero");
    const hero = page.locator("#hero");
    await expect(hero).toHaveCount(1);
    // The nav's home link points here; it must resolve to a real section.
    await expect(page.locator('nav[aria-label="Primary"] a[href="#hero"]')).toHaveCount(1);
    await expect(hero.getByRole("heading", { level: 1, name: /Huy Le/i })).toBeVisible();
  });

  test("navigation is a single centered pill that does not overlap the hero identity", async ({
    page,
  }) => {
    await gotoReady(page);
    const navs = page.locator("nav");
    await expect(navs).toHaveCount(1);

    const nav = page.locator('nav[aria-label="Primary"]');
    const h1 = page.locator("#hero").getByRole("heading", { level: 1 });
    const navBox = await nav.boundingBox();
    const h1Box = await h1.boundingBox();
    expect(navBox).not.toBeNull();
    expect(h1Box).not.toBeNull();
    // Nav sits entirely above the hero's identity heading (no vertical overlap).
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(h1Box!.y);
  });

  test("the oversized name is the largest element in the hero", async ({ page }) => {
    await gotoReady(page);
    // The wordmark SVG (the "spine") towers over the small identity heading — the
    // h1 is a full-width block, so compare rendered height, not width.
    const wordmark = page.locator("#hero svg").first();
    const h1 = page.locator("#hero").getByRole("heading", { level: 1 });
    const wmBox = await wordmark.boundingBox();
    const h1Box = await h1.boundingBox();
    expect(wmBox!.height).toBeGreaterThan(h1Box!.height * 2);
  });

  test("mobile viewport has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoReady(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("the mission-statement beat sits between hero and capabilities", async ({ page }) => {
    await gotoReady(page);
    const ids = await page.evaluate(() =>
      [...document.querySelectorAll("main > section")].map((s) => s.id),
    );
    expect(ids.indexOf("statement")).toBeGreaterThan(ids.indexOf("hero"));
    expect(ids.indexOf("statement")).toBeLessThan(ids.indexOf("what-i-do"));
  });
});

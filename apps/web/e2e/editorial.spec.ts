import { test, expect, type Page } from "@playwright/test";

/**
 * Navigate and wait until the first-visit intro overlay has revealed the site.
 * During the intro, `#site-content` is `visibility:hidden` (removed from the a11y
 * tree), so assertions on hero content must wait for it to finish. Skips the
 * intro (a keypress triggers its fast-forward) and resolves once it's gone.
 *
 * Also waits for the display font to actually swap in before pinning scroll to
 * the top: the oversized hero type is set in Fredoka, and until it loads the
 * fallback face is wider — "Software" wraps to a second line, adding a third line
 * that inflates the hero and shoves the title up under the nav. In Next dev under
 * load the font can lag past `document.fonts.ready`, so we wait until the title
 * measures at its settled ~2 lines rather than the fallback's ~3.
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
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  // One gate for the settled layout: the title back to its ~2 lines (font swapped
  // in, not the taller fallback), scroll at the top, and its rendered top holding
  // steady (ScrollSmoother lerps, so scrollY can read 0 while content catches up).
  // Require several consecutive stable frames so we don't sample a transient.
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __lastTop?: number; __okCount?: number };
      const t = document.querySelector("[data-hero-title]");
      if (!t) return true; // no hero title on this route
      const fs = parseFloat(getComputedStyle(t).fontSize) || 1;
      const rect = t.getBoundingClientRect();
      const top = Math.round(rect.top);
      const ok =
        rect.height / (fs * 0.9) <= 2.4 && // ~2 lines (settled), not fallback's ~3
        window.scrollY === 0 &&
        w.__lastTop === top; // rendered top unchanged since last frame
      w.__lastTop = top;
      w.__okCount = ok ? (w.__okCount ?? 0) + 1 : 0;
      return (w.__okCount ?? 0) >= 3;
    },
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
    // Visible spine is the oversized role; the name is carried by an sr-only h1.
    await expect(page.locator("[data-hero-title]")).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1, name: /Huy Le/i })).toHaveCount(1);
  });

  test("navigation is a single centered pill that does not overlap the hero identity", async ({
    page,
  }) => {
    await gotoReady(page);
    const navs = page.locator("nav");
    await expect(navs).toHaveCount(1);

    const nav = page.locator('nav[aria-label="Primary"]');
    const title = page.locator("[data-hero-title]");
    const navBox = await nav.boundingBox();
    const titleBox = await title.boundingBox();
    expect(navBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    // Nav sits entirely above the oversized hero type (no vertical overlap).
    expect(navBox!.y + navBox!.height).toBeLessThanOrEqual(titleBox!.y);
  });

  test("the oversized role type is the largest element in the hero", async ({ page }) => {
    await gotoReady(page);
    // The two-line role "spine" spans much wider than the portrait card.
    const title = page.locator("[data-hero-title]");
    const portrait = page.locator("#hero img").first();
    const titleBox = await title.boundingBox();
    const portraitBox = await portrait.boundingBox();
    expect(titleBox!.width).toBeGreaterThan(portraitBox!.width);
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

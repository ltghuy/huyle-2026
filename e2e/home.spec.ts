import { test, expect } from "@playwright/test";

test.describe("home page smoke", () => {
  test("renders identity, all sections, and resolves links", async ({ page }) => {
    await page.goto("/");
    // Wait out the first-visit intro overlay (it hides #site-content until done).
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForFunction(
      () =>
        (window as unknown as { __introComplete?: boolean }).__introComplete === true ||
        !document.querySelector('[role="img"][aria-label="Evan"]'),
      null,
      { timeout: 15_000 },
    );

    // Identity
    await expect(page.getByRole("heading", { name: "Huy Le", level: 1 })).toBeVisible();
    await expect(page.locator("#hero")).toContainText("Software Engineer · AI-Native Development");

    // Sections present
    for (const id of ["what-i-do", "experience", "work", "about", "contact"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    // Contact email + a social profile resolve to the right destinations
    await expect(
      page.locator('a[href="mailto:letrangiahuy0507@gmail.com"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('#contact a[href="https://github.com/ltghuy"]'),
    ).toHaveAttribute("rel", /noopener/);
  });

  test("work carousel advances between projects", async ({ page }) => {
    await page.goto("/");
    const work = page.locator("#work");
    await work.scrollIntoViewIfNeeded();
    await expect(work.getByRole("heading", { name: "Naver Care" })).toBeVisible();
    await work.getByRole("button", { name: "Next project" }).click();
    await expect(work.getByRole("heading", { name: "InjuryEx" })).toBeVisible();
  });

  test("falls back to the poster (no canvas) under reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Huy Le", level: 1 })).toBeVisible();
    // 3D canvas must not render when motion is reduced
    await expect(page.locator("canvas")).toHaveCount(0);
    await context.close();
  });
});

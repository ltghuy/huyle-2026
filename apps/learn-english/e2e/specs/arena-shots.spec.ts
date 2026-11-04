import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { E2E_USERS, signInAs } from "../helpers";

// Feature 023 T024: screenshots of every Arena screen for visual QA, at phone, tablet and desktop
// widths in light and dark. Not part of the suite: run with `ARENA_SHOTS=1 pnpm exec playwright
// test e2e/specs/arena-shots.spec.ts`. Images go to the feature's designs/ folder.

const OUT = join(__dirname, "../../../../.artifacts/features/learn-english/023-arena/designs");
const SIZES = [
  { name: "375", width: 375, height: 812, full: true },
  { name: "768", width: 768, height: 1024, full: false },
  { name: "1280", width: 1280, height: 800, full: true },
] as const;
const THEMES = ["light", "dark"] as const;

test.skip(!process.env.ARENA_SHOTS, "Visual QA screenshots: set ARENA_SHOTS=1");
test.describe.configure({ mode: "serial" });

type User = (typeof E2E_USERS)[keyof typeof E2E_USERS];

async function open(browser: Browser, user: User, baseURL: string, size: (typeof SIZES)[number], theme: (typeof THEMES)[number]) {
  const context = await browser.newContext({ baseURL, viewport: { width: size.width, height: size.height }, colorScheme: theme, locale: "vi-VN", reducedMotion: "reduce", isMobile: size.width < 500, hasTouch: size.width < 500 });
  await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await signInAs(context, user, baseURL);
  return context.newPage();
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
}

async function create(page: Page, mode: RegExp, rounds: RegExp, prefix?: string): Promise<string> {
  await page.goto("/arena");
  await expect(page.getByRole("link", { name: "Đấu 1-1" })).toBeVisible();
  if (prefix) await shot(page, `${prefix}-hub`);
  await page.getByRole("link", { name: "Đấu 1-1" }).click();
  await page.waitForURL("**/arena/1v1");
  await page.getByRole("button", { name: "A2" }).click();
  await page.getByRole("radio", { name: mode }).check({ force: true });
  await page.getByRole("button", { name: rounds }).click();
  await expect(page.getByRole("button", { name: "Tạo phòng" })).toBeEnabled({ timeout: 15_000 });
  if (prefix) await shot(page, `${prefix}-create`);
  await page.getByRole("button", { name: "Tạo phòng" }).click();
  await page.waitForURL(/code=/);
  return new URL(page.url()).searchParams.get("code")!;
}

const openOption = (page: Page) => page.locator('[role="radio"]:not([disabled])');

/** Waits for the next open question and says its type, or "end" when the match is over. */
async function openQuestion(page: Page): Promise<"listen" | "recall" | "write" | "end"> {
  const opened = (locator: ReturnType<Page["locator"]>, type: "listen" | "recall" | "write") => locator.first().waitFor({ timeout: 45_000 }).then(() => type);
  return Promise.race([
    opened(openOption(page), "listen"),
    opened(page.locator('input[aria-label="Từ tiếng Anh"]:not([disabled])'), "recall"),
    opened(page.locator('textarea[aria-label="Câu tiếng Anh"]:not([disabled])'), "write"),
    page.locator("#match-title").waitFor({ timeout: 45_000 }).then(() => "end" as const),
  ]);
}

for (const size of SIZES) {
  for (const theme of THEMES) {
    test(`Arena screens at ${size.name} px, ${theme}`, async ({ browser, baseURL }) => {
      test.setTimeout(300_000);
      mkdirSync(OUT, { recursive: true });
      const p = `${size.name}-${theme}`;
      const minh = await open(browser, E2E_USERS.minh, baseURL!, size, theme);
      const lan = await open(browser, E2E_USERS.lan, baseURL!, size, theme);

      // Room 1, mixed: hub, create, lobby, then one question of each type and its reveal.
      const code = await create(minh, /^Hỗn hợp/, /1 hiệp/, p);
      await expect(minh.getByText("Đang chờ đối thủ", { exact: false })).toBeVisible();
      await shot(minh, `${p}-lobby-waiting`);
      await lan.goto(`/arena/room?code=${code}`);
      await expect(minh.getByRole("timer")).toBeVisible({ timeout: 15_000 });
      await lan.getByRole("button", { name: "Sẵn sàng" }).click();
      await expect(minh.getByText("Sẵn sàng", { exact: true }).first()).toBeVisible();
      await shot(minh, `${p}-lobby-ready`);
      await minh.getByRole("button", { name: "Sẵn sàng" }).click();

      const seen = new Set<string>();
      for (let i = 0; i < 12 && seen.size < 3; i++) {
        const type = await openQuestion(minh);
        if (type === "end") break;
        const first = !seen.has(type);
        if (type === "listen") {
          if (first) await shot(minh, `${p}-question-listen`);
          await openOption(lan).first().waitFor();
          await openOption(minh).first().click();
          if ((await openOption(lan).count()) > 0) await openOption(lan).nth(1).click();
        } else {
          const box = minh.getByLabel(type === "recall" ? "Từ tiếng Anh" : "Câu tiếng Anh");
          if (first) {
            await box.fill(type === "recall" ? "cas" : "I see the");
            await shot(minh, `${p}-question-${type}`);
            await box.press("Enter");
            await expect(minh.getByText("Chưa đúng, bạn thử lại nhé.")).toBeVisible();
            await shot(minh, `${p}-question-${type}-wrong`);
          }
        }
        await expect(minh.getByRole("region", { name: "Đáp án" })).toBeVisible({ timeout: 35_000 });
        if (first) await shot(minh, `${p}-reveal-${type}`);
        seen.add(type);
        await expect(minh.getByRole("region", { name: "Đáp án" })).toBeHidden({ timeout: 10_000 });
        if (!size.full) break;
      }

      if (size.full) {
        // Leaving mid-match: the confirmation, then the result on both sides.
        await minh.getByRole("button", { name: /Rời trận/ }).click();
        await shot(minh, `${p}-leave-confirm`);
        await minh.getByRole("alertdialog").getByRole("button", { name: "Rời trận" }).click();
        await expect(lan.locator("#match-title")).toBeVisible({ timeout: 10_000 });
        await shot(lan, `${p}-match-won`);

        // Room 2, listen best of 3: quick picks reach the round result; then the paused overlay.
        const code2 = await create(minh, /^Nghe/, /3 hiệp/);
        await lan.goto(`/arena/room?code=${code2}`);
        await expect(minh.getByRole("timer")).toBeVisible({ timeout: 15_000 });
        await minh.getByRole("button", { name: "Sẵn sàng" }).click();
        await lan.getByRole("button", { name: "Sẵn sàng" }).click();
        // Watch for the round result from the start: it shows for only 5 s.
        let roundShown = false;
        const roundResult = minh
          .locator("#round-title")
          .waitFor({ timeout: 180_000 })
          .then(async () => {
            await shot(minh, `${p}-round-result`);
            roundShown = true;
          });
        while (!roundShown) {
          const opened = await openOption(minh)
            .first()
            .waitFor({ timeout: 2_000 })
            .then(() => true, () => false);
          if (!opened || roundShown) continue;
          await openOption(lan).first().waitFor();
          await openOption(minh).first().click();
          if ((await openOption(lan).count()) > 0) await openOption(lan).nth(1).click();
          await expect(minh.getByRole("region", { name: "Đáp án" })).toBeVisible({ timeout: 20_000 });
        }
        await roundResult;
        await openOption(minh).first().waitFor({ timeout: 15_000 });
        await lan.goto("about:blank");
        await expect(minh.getByText("Đang chờ Lan kết nối lại…")).toBeVisible({ timeout: 10_000 });
        await shot(minh, `${p}-paused`);
        await expect(minh.locator("#match-title")).toBeVisible({ timeout: 45_000 });
        await shot(minh, `${p}-match-forfeit`);

        await minh.goto("/profile");
        await minh.getByRole("heading", { name: "Thành tích đấu" }).scrollIntoViewIfNeeded();
        await shot(minh, `${p}-profile-stats`);
      }
      await minh.context().close();
      await lan.context().close();
    });
  }
}

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { E2E_USERS, signInAs } from "../helpers";

// Translate a sentence (feature 016) in the exercise library. The e2e content
// has an approved wording for "Tôi có quả táo." ("I've got an apple."), in
// scripts/fixtures/content/wording/A1-claims.json.

async function openTranslateSet(page: Page, context: BrowserContext, baseURL: string) {
  // The exercise library needs a signed-in learner (feature 022).
  await signInAs(context, E2E_USERS.thu, baseURL);
  await page.goto("/exercises?level=A1&type=translate");
  await page.getByRole("button", { name: /Bắt đầu/ }).first().click();
  await expect(page.getByText("Dịch câu sau sang tiếng Anh")).toBeVisible();
}

const prompt = (page: Page) => page.locator("main p.text-xl");
const answerBox = (page: Page) => page.getByRole("textbox", { name: "Câu tiếng Anh của bạn" });

test("a wrong translation can be claimed as correct, and the session goes on (016 AC-006, AC-007)", async ({ page, context, baseURL }) => {
  await openTranslateSet(page, context, baseURL!);
  const sent = page.waitForResponse((response) => response.url().endsWith("/api/claims") && response.request().method() === "POST");

  await answerBox(page).fill("This is my own wording");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Chưa đúng")).toBeVisible();
  await page.getByRole("button", { name: "Câu của mình cũng đúng" }).click();
  await expect(page.getByText("Đã tính là đúng")).toBeVisible();

  const response = await sent;
  expect(response.status()).toBe(200);
  expect((await response.json()).accepted).toHaveLength(1);

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(answerBox(page)).toBeEnabled();
  await expect(answerBox(page)).toHaveValue("");
});

test("an approved wording is accepted straight away (016 AC-004, AC-012)", async ({ page, context, baseURL }) => {
  await openTranslateSet(page, context, baseURL!);
  // A run draws 10 of the level's sentences, so new rounds ("Làm lại") are
  // started until the apple sentence comes up. Other steps are claimed, so no
  // retry round starts.
  for (let step = 0; step < 60; step++) {
    const done = page.getByText("Hoàn thành bài tập");
    await expect(answerBox(page).or(done)).toBeVisible();
    if (await done.isVisible()) await page.getByRole("button", { name: "Làm lại", exact: true }).click();
    await expect(answerBox(page)).toBeEnabled();
    await expect(answerBox(page)).toHaveValue("");
    const vi = (await prompt(page).textContent())?.trim();
    if (vi === "Tôi có quả táo.") {
      await answerBox(page).fill("I've got an apple");
      await page.getByRole("button", { name: "Kiểm tra" }).click();
      await expect(page.getByText("Chính xác!")).toBeVisible();
      return;
    }
    await answerBox(page).fill("x");
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await page.getByRole("button", { name: "Câu của mình cũng đúng" }).click();
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await expect(page.getByText("Đã tính là đúng")).toBeHidden();
  }
  throw new Error("the apple sentence never came up");
});

// AI grading with the learner's own keys (feature 033). Google is stubbed:
// every request to it is answered here, by key.
const GOOGLE = "https://generativelanguage.googleapis.com/**";
const KEYS = ["e2e-key-one-1111", "e2e-key-two-2222"];
const DAY_QUOTA = { error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } };
const VERDICT_CORRECT = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"correct": true, "explanationVi": ""}' }] } }] };

/** Answers Google's key check with 200 and each grading call from `grade`, by key. */
async function stubGoogle(page: Page, grade: (key: string) => { status: number; body: unknown }) {
  const graded: string[] = [];
  await page.route(GOOGLE, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
    const key = (await request.headerValue("x-goog-api-key")) ?? "";
    if (request.method() === "GET") return route.fulfill({ status: 200, json: { models: [] } });
    graded.push(key);
    const { status, body } = grade(key);
    return route.fulfill({ status, json: body });
  });
  return graded;
}

/** Fails the test if any request to the app's own server carries a key (AC-005). */
function watchOwnServer(page: Page) {
  const leaks: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://generativelanguage.googleapis.com")) return;
    const text = `${request.url()} ${JSON.stringify(request.headers())} ${request.postData() ?? ""}`;
    if (KEYS.some((key) => text.includes(key))) leaks.push(request.url());
  });
  return leaks;
}

async function addKeys(page: Page, context: BrowserContext, baseURL: string) {
  // The exercise library needs a signed-in learner (feature 022).
  await signInAs(context, E2E_USERS.thu, baseURL);
  await page.goto("/settings");
  const card = page.locator("#cham-bang-ai");
  for (const key of KEYS) {
    await card.getByLabel("Thêm khóa API").fill(key);
    await card.getByRole("button", { name: "Thêm khóa" }).click();
    await expect(card.getByText(`••••${key.slice(-4)}`)).toBeVisible();
  }
}

test("AI grading accepts a different right wording, moving to key 2 when key 1 is out for the day (033 AC-002, AC-009, AC-013, AC-017)", async ({ page, context, baseURL }) => {
  const leaks = watchOwnServer(page);
  const graded = await stubGoogle(page, (key) => (key === KEYS[0] ? { status: 429, body: DAY_QUOTA } : { status: 200, body: VERDICT_CORRECT }));
  await addKeys(page, context, baseURL!);
  await page.goto("/exercises?level=A1&type=translate");
  await page.getByRole("button", { name: /Bắt đầu/ }).first().click();

  const sent = page.waitForRequest((request) => request.url().endsWith("/api/claims") && request.method() === "POST");
  await answerBox(page).fill("This is my own wording");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Chính xác!")).toBeVisible();
  await expect(page.getByText("Chấm bằng AI")).toBeVisible();
  await expect(page.getByRole("button", { name: "Câu của mình cũng đúng" })).toBeHidden();
  expect(graded).toEqual(KEYS);
  expect((await sent).postDataJSON().claims[0]).toMatchObject({ answer: "This is my own wording", source: "ai" });

  await page.goto("/settings");
  const card = page.locator("#cham-bang-ai");
  await expect(card.getByRole("listitem").first()).toContainText("Hết lượt hôm nay");
  await expect(card.getByRole("listitem").nth(1)).toContainText("Đang dùng được");
  expect(leaks).toEqual([]);
});

test("with every key out, the answer is graded by matching and says why (033 AC-016)", async ({ page, context, baseURL }) => {
  const leaks = watchOwnServer(page);
  await stubGoogle(page, () => ({ status: 429, body: DAY_QUOTA }));
  await addKeys(page, context, baseURL!);
  await page.goto("/exercises?level=A1&type=translate");
  await page.getByRole("button", { name: /Bắt đầu/ }).first().click();

  await answerBox(page).fill("This is my own wording");
  await page.getByRole("button", { name: "Kiểm tra" }).click();
  await expect(page.getByText("Chưa đúng")).toBeVisible();
  await expect(page.getByText(/chưa chấm bằng AI được/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Câu của mình cũng đúng" })).toBeVisible();
  expect(leaks).toEqual([]);
});

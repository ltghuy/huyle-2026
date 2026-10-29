import { expect, type Page } from "@playwright/test";
import { skipPlacement, skipWelcome } from "./helpers";

/**
 * Feature 012 against the fixture set "Văn phòng (thử)" (deadline, book,
 * invoice): open Chuyên ngành, open the set, reload, follow it, and meet its
 * first word in today's lesson. Shared by the desktop and mobile specs.
 */
export async function followSetIntoLesson(page: Page) {
  // The set row is served with its words embedded.
  const { version } = (await (await page.request.get("/api/content/version")).json()) as { version: number };
  const response = (await (await page.request.get(`/api/content/items?kind=set&v=${version}`)).json()) as {
    items: { id: string; body: { words: { id: string }[] } }[];
  };
  expect(response.items.map((item) => item.id)).toEqual(["set:fx-office"]);
  expect(response.items[0].body.words.map((word) => word.id)).toEqual(["word:deadline-n", "word:book-n", "word:invoice-n"]);

  await skipPlacement(page);
  await skipWelcome(page);

  // Từ vựng → Chuyên ngành → the set (AC-001, AC-002).
  await page.goto("/vocabulary");
  await page.getByRole("tab", { name: "Chuyên ngành" }).click();
  const card = page.getByRole("link", { name: /Văn phòng \(thử\)/ });
  await expect(card).toContainText("3 từ");
  await card.click();
  await expect(page.getByRole("heading", { name: "Văn phòng (thử)" })).toBeVisible();

  // A specialized word shows the set's name, a course word its level (AC-004).
  const list = page.getByRole("region", { name: "Danh sách từ" });
  await expect(list.getByRole("link", { name: /deadline/ })).toContainText("Văn phòng (thử)");
  await expect(list.getByRole("link", { name: /book/ })).toContainText("A1");

  // A reload reopens the set and the open word (AC-006).
  await list.getByRole("link", { name: /deadline/ }).click();
  await expect(page.getByRole("dialog")).toContainText("hạn chót");
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText("hạn chót");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Văn phòng (thử)" })).toBeVisible();

  // Follow it (AC-007).
  await page.getByRole("button", { name: "Học bộ này" }).click();
  await expect(page.getByText(/Bạn đang học bộ “Văn phòng \(thử\)”/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ngừng học bộ này" })).toBeVisible();

  // Home shows it, and today's lesson starts with its first word (AC-008, AC-013).
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Văn phòng (thử)" })).toBeVisible();
  await expect(page.getByText("0/3")).toBeVisible();
  await page.getByRole("link", { name: "Bắt đầu" }).click();
  await page.waitForURL("**/lesson");
  await expect(page.getByRole("heading", { name: "deadline" })).toBeVisible();
}

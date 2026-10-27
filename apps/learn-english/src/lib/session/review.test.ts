import { describe, expect, it } from "vitest";
import { grammar, word } from "@/learning/exercises/fixtures";
import { makeCard } from "@/storage/test-utils";
import { buildContentIndex } from "./content-index";
import { reviewQueue, reviewSession } from "./review";

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 27, 3); // 10:00 in Vietnam
const profile = { level: "A1" as const, timeZone: "Asia/Ho_Chi_Minh" };
const index = buildContentIndex(
  [word("apple"), word("cat"), word("gone"), grammar("present-simple", [{ prompt: "She ___.", answer: "runs", explanationVi: "x" }])],
  new Set(["word:gone"]),
);

describe("reviewQueue", () => {
  it("takes cards due by the end of today and skips tombstoned items", () => {
    const cards = [
      makeCard("word:apple", now - DAY),
      makeCard("word:cat", now + 10 * 3_600_000), // 20:00 today in Vietnam
      makeCard("word:gone", now - DAY),
      makeCard("grammar:present-simple", now + 3 * DAY),
    ];
    const { due, nextDue } = reviewQueue(cards, profile, index, now);
    expect(due.map((card) => card.itemId).sort()).toEqual(["word:apple", "word:cat"]);
    expect(nextDue).toBeUndefined();
  });

  it("reports the next due time when nothing is due", () => {
    const { due, nextDue } = reviewQueue([makeCard("grammar:present-simple", now + 3 * DAY)], profile, index, now);
    expect(due).toEqual([]);
    expect(nextDue).toBe(now + 3 * DAY);
  });
});

describe("reviewSession", () => {
  it("gives grammar gap-fill and includes a multiple-choice question", () => {
    const descriptors = reviewSession([makeCard("grammar:present-simple", now), makeCard("word:apple", now), makeCard("word:cat", now)], index, now);
    expect(descriptors[0].kind).toBe("grammar-gap");
    expect(descriptors.some((descriptor) => descriptor.kind === "mcq")).toBe(true);
  });
});

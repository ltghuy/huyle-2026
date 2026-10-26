import { describe, expect, it } from "vitest";
import { newCard, retrievability, review } from "./srs";
import type { StoredCard } from "./types";

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const T0 = Date.UTC(2026, 0, 1, 2, 0, 0);

/** Review `card` with `rating` each time it falls due; returns every card. */
function reviewAtDue(card: StoredCard, ratings: ("again" | "hard" | "good")[]): StoredCard[] {
  const out: StoredCard[] = [];
  let current = card;
  for (const r of ratings) {
    current = review(current, r, current.due);
    out.push(current);
  }
  return out;
}

describe("newCard", () => {
  it("is a new card due now, with epoch-ms dates", () => {
    const card = newCard("word:apple", T0);
    expect(card).toMatchObject({ itemId: "word:apple", due: T0, state: 0, reps: 0, lapses: 0, addedAt: T0, updatedAt: T0 });
    expect(card.last_review).toBeUndefined();
  });
});

describe("review", () => {
  it("brings a wrong answer back within minutes", () => {
    const card = review(newCard("word:apple", T0), "again", T0);
    expect(card.due - T0).toBeLessThanOrEqual(10 * MIN);
    expect(card.last_review).toBe(T0);
    expect(card.updatedAt).toBe(T0);
  });

  it("relearns a forgotten review card within minutes", () => {
    const learned = reviewAtDue(newCard("word:apple", T0), ["good", "good", "good", "good"]).at(-1)!;
    expect(learned.state).toBe(2);
    const lapsed = review(learned, "again", learned.due);
    expect(lapsed.state).toBe(3);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.due - learned.due).toBeLessThanOrEqual(10 * MIN);
  });

  it("grows intervals with fast correct answers", () => {
    const cards = reviewAtDue(newCard("word:apple", T0), ["good", "good", "good", "good", "good", "good"]);
    const reviewCards = cards.filter((c) => c.state === 2);
    expect(reviewCards.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < reviewCards.length; i++) {
      expect(reviewCards[i].scheduled_days).toBeGreaterThan(reviewCards[i - 1].scheduled_days);
    }
  });

  it("schedules Hard sooner than Good from the same card", () => {
    const learned = reviewAtDue(newCard("word:apple", T0), ["good", "good", "good"]).at(-1)!;
    const hard = review(learned, "hard", learned.due);
    const good = review(learned, "good", learned.due);
    expect(hard.due).toBeLessThan(good.due);
  });

  it("never schedules beyond the 365-day maximum", () => {
    const cards = reviewAtDue(newCard("word:apple", T0), Array(20).fill("good"));
    const last = cards.at(-1)!;
    expect(last.scheduled_days).toBeLessThanOrEqual(365);
    expect(last.due - last.last_review!).toBeLessThanOrEqual(365 * DAY);
  });

  it("keeps the item id and added time", () => {
    const card = review(newCard("grammar:present-perfect", T0), "good", T0 + MIN);
    expect(card.itemId).toBe("grammar:present-perfect");
    expect(card.addedAt).toBe(T0);
    expect(card.updatedAt).toBe(T0 + MIN);
  });
});

describe("retrievability", () => {
  it("is 0 for an unseen card", () => {
    expect(retrievability(newCard("word:apple", T0), T0)).toBe(0);
  });

  it("decreases over time after a review", () => {
    const card = reviewAtDue(newCard("word:apple", T0), ["good", "good", "good"]).at(-1)!;
    const soon = retrievability(card, card.last_review! + DAY);
    const later = retrievability(card, card.last_review! + 30 * DAY);
    expect(soon).toBeGreaterThan(later);
    expect(soon).toBeLessThanOrEqual(1);
    expect(later).toBeGreaterThan(0);
  });
});

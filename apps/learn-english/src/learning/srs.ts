// The only module that imports ts-fsrs (pinned to 5.4.2; the 6.0 API differs).
import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { CardItemId, CardStateValue, RatingName, StoredCard } from "./types";

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ["1m", "10m"],
  relearning_steps: ["10m"],
});

const GRADES: Record<RatingName, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
};

function toFsrs(card: StoredCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review === undefined ? undefined : new Date(card.last_review),
  };
}

function fromFsrs(card: Card, base: Pick<StoredCard, "itemId" | "addedAt">, now: number): StoredCard {
  const stored: StoredCard = {
    itemId: base.itemId,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as CardStateValue,
    addedAt: base.addedAt,
    updatedAt: now,
  };
  if (card.last_review) stored.last_review = card.last_review.getTime();
  return stored;
}

export function newCard(itemId: CardItemId, now: number): StoredCard {
  return fromFsrs(createEmptyCard(new Date(now)), { itemId, addedAt: now }, now);
}

export function review(card: StoredCard, rating: RatingName, now: number): StoredCard {
  const { card: next } = scheduler.next(toFsrs(card), new Date(now), GRADES[rating]);
  return fromFsrs(next, card, now);
}

/** Probability (0–1) the learner still recalls the item at `now`; 0 for unseen cards. */
export function retrievability(card: StoredCard, now: number): number {
  return scheduler.get_retrievability(toFsrs(card), new Date(now), false);
}

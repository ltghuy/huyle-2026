import { rate } from "@/learning/rating";
import { newCard, review } from "@/learning/srs";
import type { AttemptContext, CardItemId, DailyLesson, StoredCard } from "@/learning/types";
import { newAttemptId, recordAnswer } from "@/storage/attempts";
import { getCard, putCards } from "@/storage/cards";
import type { StepOutcome } from "@/components/exercise/exercise-runner";

const isCardId = (id: string): id is CardItemId => id.startsWith("word:") || id.startsWith("grammar:");

interface RecordInput {
  outcome: StepOutcome;
  context: AttemptContext;
  now: number;
  /** Lesson position to save in the same transaction (resume, AC-016). */
  lessonPosition?: Pick<DailyLesson, "date" | "position">;
}

/**
 * Saves one checked answer: the attempt, the item's card (created if this is
 * the first check of a new word or grammar point), and, after a wrong answer,
 * brings the related cards forward so they come back in the next review.
 */
export async function recordOutcome({ outcome, context, now, lessonPosition }: RecordInput): Promise<void> {
  const { result, ms, itemId, exercise } = outcome;
  const selfMarked = exercise === "writing";
  const rating = rate({ correct: result.correct, ms, hinted: false, typo: Boolean(result.typo), selfMarked });

  let card: StoredCard | undefined;
  if (isCardId(itemId)) {
    const existing = await getCard(itemId);
    card = review(existing ?? newCard(itemId, now), rating, now);
  }

  await recordAnswer({
    attempt: {
      id: newAttemptId(),
      itemId,
      at: now,
      correct: result.correct,
      ms,
      hinted: false,
      typo: Boolean(result.typo),
      selfMarked,
      exercise,
      context,
      rating,
    },
    card,
    lesson: lessonPosition ? { ...lessonPosition, updatedAt: now } : undefined,
  });

  if (!result.correct && outcome.related.length > 0) await bringForward(outcome.related.filter((id) => id !== itemId), now);
}

/** Makes existing cards due now (AC-035); items not studied yet are left alone. */
async function bringForward(ids: readonly CardItemId[], now: number): Promise<void> {
  const cards = (await Promise.all(ids.map((id) => getCard(id)))).filter((card): card is StoredCard => card !== undefined && card.due > now);
  if (cards.length) await putCards(cards.map((card) => ({ ...card, due: now, updatedAt: now })));
}

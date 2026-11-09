import { rate } from "@/learning/rating";
import { newCard, review } from "@/learning/srs";
import type { AttemptContext, CardItemId, StoredCard } from "@/learning/types";
import { newAttemptId, recordAnswer, type LessonAt } from "@/storage/attempts";
import { getCard, putCards } from "@/storage/cards";
import type { StepOutcome } from "@/components/exercise/exercise-runner";
import { countAttempt } from "@/stats/stats-client";

const isCardId = (id: string): id is CardItemId => id.startsWith("word:") || id.startsWith("grammar:") || id.startsWith("forms:");

interface RecordInput {
  outcome: StepOutcome;
  context: AttemptContext;
  now: number;
  /** Lesson position to save in the same transaction (resume, AC-016; extra lessons, 013 AC-009). */
  lessonPosition?: LessonAt;
}

/**
 * Saves one checked answer: the attempt, the item's card (created if this is
 * the first check of a new word or grammar point), and, after a wrong answer,
 * brings the related cards forward so they come back in the next review.
 */
export async function recordOutcome({ outcome, context, now, lessonPosition }: RecordInput): Promise<void> {
  const { result, ms, itemId, exercise } = outcome;
  // Writing is never timed: a paragraph takes as long as it takes. The learner marks it unless the AI reviewed it (feature 036, AC-004).
  const untimed = exercise === "writing";
  const selfMarked = untimed && !result.aiGraded;
  const rating = rate({ correct: result.correct, ms: untimed ? 0 : ms, hinted: Boolean(result.hinted), typo: Boolean(result.typo), selfMarked });

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
      hinted: Boolean(result.hinted),
      typo: Boolean(result.typo),
      selfMarked,
      exercise,
      context,
      rating,
    },
    card,
    lesson: lessonPosition ? { ...lessonPosition, updatedAt: now } : undefined,
  });

  await countAttempt({ exercise, itemId, correct: result.correct }, now);
  if (!result.correct && outcome.related.length > 0) await bringForward(outcome.related.filter((id) => id !== itemId), now);
}

/** Makes existing cards due now (AC-035); items not studied yet are left alone. Also used when a claim is rejected (016 AC-016). */
export async function bringForward(ids: readonly CardItemId[], now: number): Promise<void> {
  const cards = (await Promise.all(ids.map((id) => getCard(id)))).filter((card): card is StoredCard => card !== undefined && card.due > now);
  if (cards.length) await putCards(cards.map((card) => ({ ...card, due: now, updatedAt: now })));
}

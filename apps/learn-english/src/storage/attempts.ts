import type { Attempt, StoredCard } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb, type StoreName } from "./db";

/** A random UUID, so attempts from two devices merge by union. */
export function newAttemptId(): string {
  return crypto.randomUUID();
}

export async function addAttempt(attempt: Attempt): Promise<void> {
  await (await getDb()).put("attempts", attempt);
  notifyChanged(["attempts"]);
}

/** One item's attempts, oldest first; with `limit`, only the latest `limit`. */
export async function getAttemptsForItem(itemId: string, limit?: number): Promise<Attempt[]> {
  const attempts = await (await getDb()).getAllFromIndex("attempts", "itemId_at", {
    lower: [itemId, -Infinity],
    upper: [itemId, Infinity],
  });
  return limit === undefined ? attempts : attempts.slice(-limit);
}

/** Attempts at or after `since`, oldest first. */
export async function getAttemptsSince(since: number): Promise<Attempt[]> {
  return (await getDb()).getAllFromIndex("attempts", "at", { lower: since });
}

export async function getAllAttempts(): Promise<Attempt[]> {
  return (await getDb()).getAll("attempts");
}

export interface AnswerRecord {
  attempt: Attempt;
  /** The card after scheduling; omitted for answers that don't move a card. */
  card?: StoredCard;
  /** Moves this date's lesson to `position` (ignored when the lesson is missing). */
  lesson?: { date: string; position: { part: number; index: number }; updatedAt: number };
}

/** Saves one answer (attempt, card, lesson position) in a single transaction. */
export async function recordAnswer({ attempt, card, lesson }: AnswerRecord): Promise<void> {
  const stores: StoreName[] = ["attempts"];
  if (card) stores.push("cards");
  if (lesson) stores.push("lessons");
  await (await getDb()).transaction(stores, async (tx) => {
    await tx.put("attempts", attempt);
    if (card) await tx.put("cards", card);
    if (lesson) {
      const stored = await tx.get("lessons", lesson.date);
      if (stored) await tx.put("lessons", { ...stored, position: lesson.position, updatedAt: lesson.updatedAt });
    }
  });
  notifyChanged(stores);
}

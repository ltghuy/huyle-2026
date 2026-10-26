import type { CardItemId, StoredCard } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

export async function getCard(itemId: CardItemId): Promise<StoredCard | undefined> {
  return (await getDb()).get("cards", itemId);
}

export async function getAllCards(): Promise<StoredCard[]> {
  return (await getDb()).getAll("cards");
}

/** Cards due at or before `now`, soonest first. */
export async function getDueCards(now: number): Promise<StoredCard[]> {
  return (await getDb()).getAllFromIndex("cards", "due", { upper: now });
}

export async function putCards(cards: StoredCard[]): Promise<void> {
  if (cards.length === 0) return;
  await (await getDb()).transaction(["cards"], async (tx) => {
    await Promise.all(cards.map((card) => tx.put("cards", card)));
  });
  notifyChanged(["cards"]);
}

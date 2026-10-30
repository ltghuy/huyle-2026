import type { ExtraLesson } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

export async function getExtraLesson(id: string): Promise<ExtraLesson | undefined> {
  return (await getDb()).get("extraLessons", id);
}

export async function getAllExtraLessons(): Promise<ExtraLesson[]> {
  return (await getDb()).getAll("extraLessons");
}

/** Extra lessons bought on `date`, from any device. */
export async function getExtraLessonsOn(date: string): Promise<ExtraLesson[]> {
  return (await getDb()).getAllFromIndex("extraLessons", "date", { lower: date, upper: date });
}

export async function putExtraLesson(lesson: ExtraLesson): Promise<void> {
  await (await getDb()).put("extraLessons", lesson);
  notifyChanged(["extraLessons"]);
}

export type PurchaseResult = { status: "bought"; lesson: ExtraLesson } | { status: "taken"; id: string };

/**
 * Saves `lesson` as the `number`th purchase of its date on this device. A
 * device-local lock in `meta`, checked and written in the same readwrite
 * transaction (which IndexedDB runs one at a time across tabs), makes a second
 * tab buying the same number get "taken" and the id the first tab saved, so
 * the learner pays once. A failed `add()` would abort the transaction, hence
 * `get` then `put`. The lock never syncs, so other devices aren't held up.
 */
export async function purchaseExtraLesson(lesson: ExtraLesson, number: number): Promise<PurchaseResult> {
  const key = `extra-buy:${lesson.date}:${number}`;
  let result: PurchaseResult = { status: "bought", lesson };
  await (await getDb()).transaction(["meta", "extraLessons"], async (tx) => {
    const taken = await tx.get("meta", key);
    if (taken) {
      result = { status: "taken", id: String(taken.value) };
      return;
    }
    await tx.put("meta", { key, value: lesson.id });
    await tx.put("extraLessons", lesson);
  });
  if (result.status === "bought") notifyChanged(["extraLessons"]);
  return result;
}

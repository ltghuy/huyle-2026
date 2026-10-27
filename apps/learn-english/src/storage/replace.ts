import type { LearnerState } from "@/learning/snapshot";
import type { Profile } from "@/learning/types";
import { getAllAttempts } from "./attempts";
import { getAllAttendance } from "./attendance";
import { notifyChanged } from "./broadcast";
import { getAllCards } from "./cards";
import { getDb, type StoreName } from "./db";
import { getAllLessons } from "./lessons";
import { createDefaultProfile, getProfile } from "./meta";

/** The stores that hold the learner's progress (the content cache is left alone). */
export const LEARNER_STORES = ["cards", "attempts", "lessons", "attendance", "meta"] as const satisfies readonly StoreName[];

/** Everything the learner stores in this browser, read in parallel. */
export async function readLearnerState(now: number): Promise<LearnerState> {
  const [profile, cards, attempts, lessons, attendance] = await Promise.all([
    getProfile(),
    getAllCards(),
    getAllAttempts(),
    getAllLessons(),
    getAllAttendance(),
  ]);
  return { profile: profile ?? createDefaultProfile(now), cards, attempts, lessons, attendance };
}

/**
 * Replaces all learner progress with `state` in one transaction: either every
 * store holds the new data or, on failure, nothing changed.
 */
export async function replaceAll(state: LearnerState): Promise<void> {
  const stores = [...LEARNER_STORES];
  await (await getDb()).transaction(stores, async (tx) => {
    for (const store of stores) await tx.clear(store);
    for (const card of state.cards) await tx.put("cards", card);
    for (const attempt of state.attempts) await tx.put("attempts", attempt);
    for (const lesson of state.lessons) await tx.put("lessons", lesson);
    for (const row of state.attendance) await tx.put("attendance", row);
    await tx.put("meta", { key: "profile", value: state.profile });
  });
  notifyChanged(stores);
}

/** Clears all progress on this device and starts again with a default profile. */
export async function resetAll(now: number): Promise<Profile> {
  const profile = createDefaultProfile(now);
  await replaceAll({ profile, cards: [], attempts: [], lessons: [], attendance: [] });
  return profile;
}

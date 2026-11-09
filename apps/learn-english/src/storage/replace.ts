import type { LearnerState } from "@/learning/snapshot";
import type { Profile } from "@/learning/types";
import { getAllAttempts } from "./attempts";
import { getAllAttendance } from "./attendance";
import { notifyChanged } from "./broadcast";
import { getAllCards } from "./cards";
import { getClaims } from "./claims";
import { getDb, type StoreName } from "./db";
import { getAllExtraLessons } from "./extra-lessons";
import { getAllLessons } from "./lessons";
import { createDefaultProfile, getProfile } from "./meta";

/** The stores that hold the learner's progress (the content cache is left alone). */
export const LEARNER_STORES = ["cards", "attempts", "lessons", "extraLessons", "claims", "attendance", "meta"] as const satisfies readonly StoreName[];

/** Everything the learner stores in this browser, read in parallel. */
export async function readLearnerState(now: number): Promise<LearnerState> {
  const [profile, cards, attempts, lessons, extraLessons, claims, attendance] = await Promise.all([
    getProfile(),
    getAllCards(),
    getAllAttempts(),
    getAllLessons(),
    getAllExtraLessons(),
    getClaims(),
    getAllAttendance(),
  ]);
  return { profile: profile ?? createDefaultProfile(now), cards, attempts, lessons, extraLessons, claims, attendance };
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
    for (const extra of state.extraLessons) await tx.put("extraLessons", extra);
    for (const claim of state.claims) await tx.put("claims", claim);
    for (const row of state.attendance) await tx.put("attendance", row);
    await tx.put("meta", { key: "profile", value: state.profile });
  });
  notifyChanged(stores);
}

/** Device-only notes in localStorage that belong to the progress being cleared. */
const DEVICE_KEYS = [
  "learn-english:sync-fingerprint", // src/sync/sync-client.ts: what was last synced
  "learn-english:backup-reminder-dismissed", // src/components/settings/backup-reminder.tsx
  "learn-english:ai-keys", // src/lib/ai-keys.ts: the learner's Google AI keys (feature 033)
  "learn-english:announcements-seen", // src/lib/announcements.ts: announcements read in the bell (feature 034)
] as const;

/**
 * Clears this device after signing out or deleting the account (feature 022, AC-005, AC-023):
 * all progress and its device-only notes (Google AI keys included, feature 033) go, so the next learner starts clean. The content cache,
 * sound and colour preferences stay.
 */
export async function clearDevice(now: number): Promise<Profile> {
  const profile = await resetAll(now);
  for (const key of DEVICE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Blocked storage: nothing was kept there either.
    }
  }
  return profile;
}

/** Clears all progress on this device and starts again with a default profile. */
export async function resetAll(now: number): Promise<Profile> {
  const profile = createDefaultProfile(now);
  await replaceAll({ profile, cards: [], attempts: [], lessons: [], extraLessons: [], claims: [], attendance: [] });
  return profile;
}

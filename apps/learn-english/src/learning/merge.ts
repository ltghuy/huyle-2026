import type { LearnerState, SnapshotData, SnapshotMeta } from "./snapshot";
import type { Attempt, Attendance, DailyLesson, Profile, StoredCard } from "./types";

function byKey<T>(rows: readonly T[], key: (row: T) => string): Map<string, T> {
  return new Map(rows.map((row) => [key(row), row]));
}

/** Union by key; `pick(local, remote)` decides when both sides have a row. */
function unionBy<T>(local: readonly T[], remote: readonly T[], key: (row: T) => string, pick: (a: T, b: T) => T): T[] {
  const merged = byKey(local, key);
  for (const row of remote) {
    const mine = merged.get(key(row));
    merged.set(key(row), mine === undefined ? row : pick(mine, row));
  }
  return [...merged.values()];
}

/** Later `last_review` wins; tie: more `reps`, then later `updatedAt`; full tie keeps local. */
function pickCard(local: StoredCard, remote: StoredCard): StoredCard {
  const order =
    (remote.last_review ?? -Infinity) - (local.last_review ?? -Infinity) ||
    remote.reps - local.reps ||
    remote.updatedAt - local.updatedAt;
  return order > 0 ? remote : local;
}

/** The first award stands (earlier `at`, tie keeps local); points are never added up. */
function pickAttendance(local: Attendance, remote: Attendance): Attendance {
  return remote.at < local.at ? remote : local;
}

/** Completed wins (the earlier completion if both); else the further position, then later `updatedAt`. */
function pickLesson(local: DailyLesson, remote: DailyLesson): DailyLesson {
  if (local.completedAt !== undefined || remote.completedAt !== undefined) {
    if (remote.completedAt === undefined) return local;
    if (local.completedAt === undefined) return remote;
    return remote.completedAt < local.completedAt ? remote : local;
  }
  const order =
    remote.position.part - local.position.part ||
    remote.position.index - local.position.index ||
    remote.updatedAt - local.updatedAt;
  return order > 0 ? remote : local;
}

/**
 * Last writer wins per field by `fieldUpdatedAt`; a field without a timestamp
 * loses to one with, and ties keep local. `deviceId` and `sync` (this
 * device's link and bookkeeping) always stay local.
 */
function mergeProfile(local: Profile, remote: SnapshotMeta): Profile {
  const merged: Record<string, unknown> = { ...local };
  const stamps: Profile["fieldUpdatedAt"] = { ...local.fieldUpdatedAt };
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]) as Set<keyof Profile>;
  for (const key of keys) {
    if (key === "deviceId" || key === "sync" || key === "fieldUpdatedAt") continue;
    const remoteAt = remote.fieldUpdatedAt[key];
    const localAt = local.fieldUpdatedAt[key];
    if (remoteAt !== undefined && (localAt === undefined || remoteAt > localAt)) {
      const value = remote[key as keyof SnapshotMeta];
      if (value === undefined) delete merged[key];
      else merged[key] = value;
      stamps[key] = remoteAt;
    }
  }
  return { ...(merged as unknown as Profile), deviceId: local.deviceId, fieldUpdatedAt: stamps };
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Two-way merge of this device's state with a remote snapshot's data (sync). */
export function mergeSnapshots(local: LearnerState, remote: SnapshotData): LearnerState {
  return {
    profile: mergeProfile(local.profile, remote.meta),
    cards: unionBy(local.cards, remote.cards, (card) => card.itemId, pickCard).sort((a, b) =>
      compareText(a.itemId, b.itemId),
    ),
    attendance: unionBy(local.attendance, remote.attendance, (row) => row.date, pickAttendance).sort((a, b) =>
      compareText(a.date, b.date),
    ),
    lessons: unionBy(local.lessons, remote.lessons, (lesson) => lesson.date, pickLesson).sort((a, b) =>
      compareText(a.date, b.date),
    ),
    attempts: unionBy<Attempt>(local.attempts, remote.attempts, (attempt) => attempt.id, (mine) => mine).sort(
      (a, b) => a.at - b.at || compareText(a.id, b.id),
    ),
  };
}

import { describe, expect, it } from "vitest";
import { mergeSnapshots } from "./merge";
import { toSnapshotMeta, type LearnerState, type SnapshotData } from "./snapshot";
import type { Attempt, DailyLesson, ExtraLesson, Profile, StoredCard } from "./types";

function card(extra: Partial<StoredCard> = {}): StoredCard {
  return {
    itemId: "word:cat",
    due: 0,
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    last_review: 100,
    addedAt: 0,
    updatedAt: 100,
    ...extra,
  };
}

function attempt(id: string, at: number): Attempt {
  return {
    id,
    itemId: "word:cat",
    at,
    correct: true,
    ms: 1000,
    hinted: false,
    typo: false,
    selfMarked: false,
    exercise: "mcq",
    context: "lesson",
    rating: "good",
  };
}

function lesson(extra: Partial<DailyLesson> = {}): DailyLesson {
  return { date: "2026-10-26", contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 1, ...extra };
}

const profile: Profile = {
  level: "A1",
  placement: "pending",
  tourSeen: false,
  createdAt: 0,
  timeZone: "Asia/Ho_Chi_Minh",
  statsOptOut: false,
  deviceId: "local-device",
  schemaVersion: 1,
  fieldUpdatedAt: {},
};

function local(extra: Partial<LearnerState> = {}): LearnerState {
  return { profile, cards: [], attendance: [], lessons: [], extraLessons: [], attempts: [], ...extra };
}

function remote(extra: Partial<SnapshotData> = {}): SnapshotData {
  return { meta: toSnapshotMeta(profile), cards: [], attendance: [], lessons: [], extraLessons: [], attempts: [], ...extra };
}

function extra(id: string, more: Partial<ExtraLesson> = {}): ExtraLesson {
  return { id, date: "2026-10-30", price: 10, purchasedAt: 1, contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: 1, ...more };
}

describe("mergeSnapshots", () => {
  it("keeps every device's extra lesson purchases (013 AC-018)", () => {
    const merged = mergeSnapshots(local({ extraLessons: [extra("2026-10-30#1#aaaa")] }), remote({ extraLessons: [extra("2026-10-30#1#bbbb")] }));
    expect(merged.extraLessons.map((e) => e.id)).toEqual(["2026-10-30#1#aaaa", "2026-10-30#1#bbbb"]);
  });

  it("takes the further progress of the same extra lesson, and never a trimmed plan over a full one", () => {
    const plan = [{ kind: "review" as const, exercises: [] }];
    const merged = mergeSnapshots(
      local({ extraLessons: [extra("x", { plan, position: { part: 0, index: 2 } })] }),
      remote({ extraLessons: [extra("x", { plan: [], completedAt: 5 })] }),
    );
    expect(merged.extraLessons).toEqual([extra("x", { plan, completedAt: 5 })]);
  });

  it("unions attempts by id without duplicates", () => {
    const merged = mergeSnapshots(
      local({ attempts: [attempt("a", 1), attempt("b", 3)] }),
      remote({ attempts: [attempt("b", 3), attempt("c", 2)] }),
    );
    expect(merged.attempts.map((a) => a.id)).toEqual(["a", "c", "b"]);
  });

  it("keeps the card with the later last_review", () => {
    const newer = card({ last_review: 200, reps: 1 });
    expect(mergeSnapshots(local({ cards: [card({ reps: 5 })] }), remote({ cards: [newer] })).cards).toEqual([newer]);
    expect(mergeSnapshots(local({ cards: [newer] }), remote({ cards: [card({ reps: 5 })] })).cards).toEqual([newer]);
  });

  it("breaks a last_review tie by reps, then by updatedAt", () => {
    const moreReps = card({ reps: 3 });
    expect(mergeSnapshots(local({ cards: [card()] }), remote({ cards: [moreReps] })).cards).toEqual([moreReps]);
    const laterUpdate = card({ updatedAt: 500 });
    expect(mergeSnapshots(local({ cards: [card()] }), remote({ cards: [laterUpdate] })).cards).toEqual([laterUpdate]);
  });

  it("prefers a reviewed card over one never reviewed, and keeps cards from both sides", () => {
    const reviewed = card({ last_review: 1, reps: 0 });
    const fresh = card({ last_review: undefined, reps: 0, updatedAt: 999 });
    const dog = card({ itemId: "word:dog" });
    const merged = mergeSnapshots(local({ cards: [fresh] }), remote({ cards: [reviewed, dog] }));
    expect(merged.cards).toEqual([reviewed, dog]);
  });

  it("unions attendance by date and never doubles points", () => {
    const merged = mergeSnapshots(
      local({ attendance: [{ date: "2026-10-25", points: 10, bonus: 0, at: 5 }] }),
      remote({
        attendance: [
          { date: "2026-10-25", points: 10, bonus: 20, at: 9 },
          { date: "2026-10-24", points: 10, bonus: 0, at: 1 },
        ],
      }),
    );
    expect(merged.attendance).toEqual([
      { date: "2026-10-24", points: 10, bonus: 0, at: 1 },
      { date: "2026-10-25", points: 10, bonus: 0, at: 5 },
    ]);
  });

  it("keeps the first award of a date when both devices have one", () => {
    const merged = mergeSnapshots(
      local({ attendance: [{ date: "2026-10-25", points: 10, bonus: 0, at: 9 }] }),
      remote({ attendance: [{ date: "2026-10-25", points: 10, bonus: 20, at: 5 }] }),
    );
    expect(merged.attendance).toEqual([{ date: "2026-10-25", points: 10, bonus: 20, at: 5 }]);
  });

  it("lets a completed lesson win over a further position", () => {
    const done = lesson({ position: { part: 1, index: 0 }, completedAt: 50 });
    const further = lesson({ position: { part: 4, index: 3 }, updatedAt: 99 });
    expect(mergeSnapshots(local({ lessons: [further] }), remote({ lessons: [done] })).lessons).toEqual([done]);
    expect(mergeSnapshots(local({ lessons: [done] }), remote({ lessons: [further] })).lessons).toEqual([done]);
  });

  it("otherwise keeps the further lesson position, comparing part then index", () => {
    const partAhead = lesson({ position: { part: 2, index: 0 } });
    const indexAhead = lesson({ position: { part: 1, index: 9 } });
    expect(mergeSnapshots(local({ lessons: [indexAhead] }), remote({ lessons: [partAhead] })).lessons).toEqual([
      partAhead,
    ]);
    const sameLater = lesson({ position: { part: 1, index: 9 }, updatedAt: 7 });
    expect(mergeSnapshots(local({ lessons: [indexAhead] }), remote({ lessons: [sameLater] })).lessons).toEqual([
      sameLater,
    ]);
  });

  it("merges profile fields last-writer-wins", () => {
    const mine = { ...profile, level: "B1" as const, tourSeen: false, fieldUpdatedAt: { level: 300, tourSeen: 100 } };
    const theirs = toSnapshotMeta({
      ...profile,
      level: "A2" as const,
      tourSeen: true,
      statsOptOut: true,
      fieldUpdatedAt: { level: 200, tourSeen: 400, statsOptOut: 50 },
    });
    const merged = mergeSnapshots(local({ profile: mine }), remote({ meta: theirs })).profile;
    expect(merged).toMatchObject({ level: "B1", tourSeen: true, statsOptOut: true });
    expect(merged.fieldUpdatedAt).toEqual({ level: 300, tourSeen: 400, statsOptOut: 50 });
  });

  it("takes the leaderboard choice made last, so two devices share one board entry (007 AC-011)", () => {
    const joined = { status: "joined" as const, id: "00000000-0000-4000-8000-000000000001", token: "a".repeat(43), name: "Gia Huy" };
    const mine = { ...profile, leaderboard: { status: "declined" as const }, fieldUpdatedAt: { leaderboard: 100 } };
    const theirs = toSnapshotMeta({ ...profile, leaderboard: joined, fieldUpdatedAt: { leaderboard: 200 } });
    expect(mergeSnapshots(local({ profile: mine }), remote({ meta: theirs })).profile.leaderboard).toEqual(joined);
  });

  it("takes the set followed or unfollowed last (012 AC-012)", () => {
    const following = { ...profile, vocabSet: "set:it", fieldUpdatedAt: { vocabSet: 100 } };
    const switched = toSnapshotMeta({ ...profile, vocabSet: "set:office", fieldUpdatedAt: { vocabSet: 200 } });
    expect(mergeSnapshots(local({ profile: following }), remote({ meta: switched })).profile.vocabSet).toBe("set:office");

    const unfollowed = toSnapshotMeta({ ...profile, fieldUpdatedAt: { vocabSet: 300 } });
    const merged = mergeSnapshots(local({ profile: following }), remote({ meta: unfollowed })).profile;
    expect(merged.vocabSet).toBeUndefined();
    expect(merged.fieldUpdatedAt.vocabSet).toBe(300);

    const olderUnfollow = toSnapshotMeta({ ...profile, fieldUpdatedAt: { vocabSet: 50 } });
    expect(mergeSnapshots(local({ profile: following }), remote({ meta: olderUnfollow })).profile.vocabSet).toBe("set:it");
  });

  it("lets a timestamped field beat one without, and keeps local on a missing remote stamp", () => {
    const theirs = toSnapshotMeta({
      ...profile,
      level: "C1" as const,
      placement: "done" as const,
      placementResult: "C1" as const,
      fieldUpdatedAt: { level: 1, placementResult: 1 },
    });
    const merged = mergeSnapshots(local(), remote({ meta: theirs })).profile;
    expect(merged.level).toBe("C1");
    expect(merged.placementResult).toBe("C1");
    expect(merged.placement).toBe("pending");
  });

  it("removes an optional field cleared later on the remote", () => {
    const mine = { ...profile, lastBackupAt: 10, fieldUpdatedAt: { lastBackupAt: 10 } };
    const theirs = toSnapshotMeta({ ...profile, fieldUpdatedAt: { lastBackupAt: 20 } });
    expect(mergeSnapshots(local({ profile: mine }), remote({ meta: theirs })).profile).not.toHaveProperty("lastBackupAt");
  });

  it("always keeps the local deviceId", () => {
    const theirs = toSnapshotMeta(profile);
    const sneaky = { ...theirs, deviceId: "remote-device", fieldUpdatedAt: { deviceId: 999 } } as SnapshotData["meta"];
    expect(mergeSnapshots(local(), remote({ meta: sneaky })).profile.deviceId).toBe("local-device");
  });

  it("always keeps this device's sync state", () => {
    const mine = { ...profile, sync: { code: "K7QM-2XRA-9DWT", rev: 4, dirty: true } };
    const sneaky = { ...toSnapshotMeta(profile), sync: { code: "OTHER", rev: 9, dirty: false }, fieldUpdatedAt: { sync: 999 } } as SnapshotData["meta"];
    expect(mergeSnapshots(local({ profile: mine }), remote({ meta: sneaky })).profile.sync).toEqual(mine.sync);
  });
});

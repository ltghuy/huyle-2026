import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  buildSnapshot,
  bytesToBase64,
  decodeSnapshot,
  encodeSnapshot,
  MIGRATIONS,
  parseSnapshot,
  type LearnerState,
  type Migration,
} from "./snapshot";
import type { Attempt, CardItemId, DailyLesson, Profile, StoredCard } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const TZ = "Asia/Ho_Chi_Minh";
// 2026-10-26 12:00 in Ho Chi Minh City (UTC+7).
const NOW = Date.UTC(2026, 9, 26, 5);

function card(itemId: CardItemId, extra: Partial<StoredCard> = {}): StoredCard {
  return {
    itemId,
    due: NOW + DAY,
    stability: 3.1,
    difficulty: 5.2,
    elapsed_days: 1,
    scheduled_days: 3,
    learning_steps: 0,
    reps: 2,
    lapses: 0,
    state: 2,
    last_review: NOW - DAY,
    addedAt: NOW - 5 * DAY,
    updatedAt: NOW - DAY,
    ...extra,
  };
}

function attempt(id: string, itemId: string, at: number): Attempt {
  return {
    id,
    itemId,
    at,
    correct: true,
    ms: 2100,
    hinted: false,
    typo: false,
    selfMarked: false,
    exercise: "mcq",
    context: "lesson",
    rating: "good",
  };
}

function lesson(date: string): DailyLesson {
  return { date, contentVersion: 1, plan: [], position: { part: 0, index: 0 }, updatedAt: NOW };
}

const profile: Profile = {
  level: "A2",
  placement: "done",
  placementResult: "A2",
  tourSeen: true,
  createdAt: NOW - 60 * DAY,
  timeZone: TZ,
  statsOptOut: false,
  deviceId: "secret-device",
  schemaVersion: 1,
  fieldUpdatedAt: { level: NOW - 10 * DAY },
};

const state: LearnerState = {
  profile,
  cards: [card("word:cat"), card("word:dog"), card("grammar:present-simple")],
  attendance: [
    { date: "2026-10-24", points: 10, bonus: 0, at: NOW - 2 * DAY },
    { date: "2026-10-25", points: 10, bonus: 0, at: NOW - DAY },
    { date: "2026-10-26", points: 10, bonus: 20, at: NOW },
  ],
  lessons: [lesson("2026-10-12"), lesson("2026-10-13"), lesson("2026-10-26")],
  attempts: [attempt("a1", "word:cat", NOW - DAY)],
};

describe("buildSnapshot", () => {
  it("drops the device id and computes the summary", () => {
    const snapshot = buildSnapshot(state, NOW, TZ);
    expect(snapshot).toMatchObject({ app: "learn-english", version: 2, exportedAt: NOW });
    expect(snapshot.data.meta).not.toHaveProperty("deviceId");
    expect(snapshot.summary).toEqual({ wordsLearned: 2, points: 50, streak: 3 });
  });

  it("never exports the sync code or sync bookkeeping", () => {
    const linked = { ...state, profile: { ...profile, sync: { code: "K7QM-2XRA-9DWT", rev: 4, dirty: true }, fieldUpdatedAt: { sync: 5 } } };
    const snapshot = buildSnapshot(linked, NOW, TZ);
    expect(snapshot.data.meta).not.toHaveProperty("sync");
    expect(snapshot.data.meta.fieldUpdatedAt).not.toHaveProperty("sync");
    expect(JSON.stringify(snapshot)).not.toContain("K7QM-2XRA-9DWT");
  });

  it("keeps only the last 14 days of lessons", () => {
    const dates = buildSnapshot(state, NOW, TZ).data.lessons.map((l) => l.date);
    expect(dates).toEqual(["2026-10-13", "2026-10-26"]);
  });

  it("keeps attempts from the last 30 days plus the latest 8 per item before that", () => {
    const old = Array.from({ length: 12 }, (_, i) => attempt(`old-${i}`, "word:cat", NOW - (40 + i) * DAY));
    const recent = Array.from({ length: 20 }, (_, i) => attempt(`new-${i}`, "word:cat", NOW - i * DAY));
    const other = [attempt("dog-old", "word:dog", NOW - 100 * DAY)];
    const { attempts } = buildSnapshot({ ...state, attempts: [...old, ...recent, ...other] }, NOW, TZ).data;
    expect(attempts).toHaveLength(8 + 20 + 1);
    const keptOld = attempts.filter((a) => a.id.startsWith("old-")).map((a) => a.id);
    expect(keptOld.toSorted()).toEqual(["old-0", "old-1", "old-2", "old-3", "old-4", "old-5", "old-6", "old-7"]);
    expect(attempts.map((a) => a.at)).toEqual(attempts.map((a) => a.at).toSorted((a, b) => a - b));
  });
});

describe("parseSnapshot", () => {
  const snapshot = buildSnapshot(state, NOW, TZ);

  it("keeps the learner's name, which backups carry for certificates (003 AC-004)", () => {
    const named = buildSnapshot({ ...state, profile: { ...profile, displayName: "Lê Gia Huy", fieldUpdatedAt: { displayName: NOW } } }, NOW, TZ);
    const parsed = parseSnapshot(JSON.stringify(named));
    expect(parsed.ok && parsed.snapshot.data.meta.displayName).toBe("Lê Gia Huy");
    expect(parsed.ok && parsed.snapshot.data.meta.fieldUpdatedAt.displayName).toBe(NOW);
  });

  it("keeps the leaderboard entry, so a restored device stays the same learner on the board (007 AC-011)", () => {
    const leaderboard = { status: "joined" as const, id: "00000000-0000-4000-8000-000000000001", token: "a".repeat(43), name: "Gia Huy" };
    const joined = buildSnapshot({ ...state, profile: { ...profile, leaderboard, fieldUpdatedAt: { leaderboard: NOW } } }, NOW, TZ);
    const parsed = parseSnapshot(JSON.stringify(joined));
    expect(parsed.ok && parsed.snapshot.data.meta.leaderboard).toEqual(leaderboard);
    expect(parsed.ok && parsed.snapshot.data.meta.fieldUpdatedAt.leaderboard).toBe(NOW);
  });

  it("keeps the followed vocabulary set (012 AC-012)", () => {
    const following = buildSnapshot({ ...state, profile: { ...profile, vocabSet: "set:it", fieldUpdatedAt: { vocabSet: NOW } } }, NOW, TZ);
    const parsed = parseSnapshot(JSON.stringify(following));
    expect(parsed.ok && parsed.snapshot.data.meta.vocabSet).toBe("set:it");
    expect(parsed.ok && parsed.snapshot.data.meta.fieldUpdatedAt.vocabSet).toBe(NOW);
  });

  it("still parses a snapshot made before vocabulary sets, and rejects a malformed set id", () => {
    const parsed = parseSnapshot(JSON.stringify(snapshot));
    expect(parsed.ok && parsed.snapshot.data.meta.vocabSet).toBeUndefined();
    const bad = buildSnapshot({ ...state, profile: { ...profile, vocabSet: "word:it" } }, NOW, TZ);
    expect(parseSnapshot(JSON.stringify(bad)).ok).toBe(false);
  });

  it("accepts its own output, as an object or as JSON text", () => {
    expect(parseSnapshot(snapshot)).toEqual({ ok: true, snapshot });
    expect(parseSnapshot(JSON.stringify(snapshot))).toEqual({ ok: true, snapshot });
  });

  it("rejects damaged files", () => {
    expect(parseSnapshot(JSON.stringify(snapshot).slice(0, -20))).toEqual({ ok: false, reason: "invalid" });
    const broken = structuredClone(snapshot) as unknown as { data: { cards: { reps: unknown }[] } };
    broken.data.cards[0].reps = "two";
    expect(parseSnapshot(broken)).toEqual({ ok: false, reason: "invalid" });
    expect(parseSnapshot({ app: "learn-english", version: "1" })).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects files from another app", () => {
    expect(parseSnapshot({ hello: "world" })).toEqual({ ok: false, reason: "not-a-backup" });
    expect(parseSnapshot("[1,2]")).toEqual({ ok: false, reason: "not-a-backup" });
    expect(parseSnapshot(null)).toEqual({ ok: false, reason: "not-a-backup" });
  });

  it("rejects a newer version", () => {
    expect(parseSnapshot({ ...snapshot, version: 3 })).toEqual({ ok: false, reason: "newer-version" });
  });

  it("upgrades an older version through the migration chain", () => {
    // A fake v0 that stored the profile under `profile` instead of `meta`.
    const { meta, ...rest } = snapshot.data;
    const v0 = { ...snapshot, version: 0, data: { ...rest, profile: meta } };
    const migrations: Record<number, Migration> = {
      0: (raw) => {
        const { profile: oldMeta, ...data } = raw.data as Record<string, unknown>;
        return { ...raw, data: { ...data, meta: oldMeta } };
      },
      1: MIGRATIONS[1],
    };
    expect(parseSnapshot(v0, migrations)).toEqual({ ok: true, snapshot });
    expect(parseSnapshot(v0)).toEqual({ ok: false, reason: "invalid" });
  });

  it("reads a version 1 file (before verb forms) as version 2 (008 AC-014)", () => {
    expect(parseSnapshot({ ...snapshot, version: 1 })).toEqual({ ok: true, snapshot });
  });

  it("keeps verb forms cards apart from the verb's word card (008 AC-008, AC-014)", () => {
    const card = (itemId: string) => ({ ...state.cards[0], itemId: itemId as CardItemId });
    const withForms = buildSnapshot({ ...state, cards: [card("word:go-v"), card("forms:go-v")] }, NOW, TZ);
    const parsed = parseSnapshot(JSON.stringify(withForms));
    expect(parsed.ok && parsed.snapshot.data.cards.map((c) => c.itemId)).toEqual(["word:go-v", "forms:go-v"]);
    // Words learned counts words only.
    expect(parsed.ok && parsed.snapshot.summary.wordsLearned).toBe(1);
  });

  it("treats a throwing migration as invalid", () => {
    const failing: Migration = () => {
      throw new Error("bad");
    };
    expect(parseSnapshot({ ...snapshot, version: 0 }, { 0: failing })).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("encodeSnapshot / decodeSnapshot", () => {
  it("round-trips through gzip and base64", async () => {
    const snapshot = buildSnapshot(state, NOW, TZ);
    const encoded = bytesToBase64(await encodeSnapshot(snapshot));
    expect(await decodeSnapshot(base64ToBytes(encoded))).toEqual({ ok: true, snapshot });
  });

  it("rejects bytes that aren't gzip", async () => {
    expect(await decodeSnapshot(new TextEncoder().encode("not gzip"))).toEqual({ ok: false, reason: "invalid" });
  });

  it("keeps a heavy profile (9,000 cards, 15,000 attempts) under 1 MB gzipped", async () => {
    let seed = 42;
    const random = () => (seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31;
    const uuid = () =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, () => Math.floor(random() * 16).toString(16));
    const cards = Array.from({ length: 9000 }, (_, i) =>
      card(i < 8000 ? `word:w${i}` : `grammar:g${i}`, {
        due: NOW + Math.floor(random() * 90 * DAY),
        stability: random() * 100,
        difficulty: 1 + random() * 9,
        elapsed_days: Math.floor(random() * 60),
        scheduled_days: Math.floor(random() * 90),
        reps: Math.floor(random() * 30),
        lapses: Math.floor(random() * 5),
        last_review: NOW - Math.floor(random() * 60 * DAY),
        addedAt: NOW - Math.floor(random() * 365 * DAY),
        updatedAt: NOW - Math.floor(random() * 60 * DAY),
      }),
    );
    // All within 30 days, so trimming keeps every one of them (worst case).
    const attempts = Array.from({ length: 15_000 }, () => ({
      ...attempt(uuid(), `word:w${Math.floor(random() * 8000)}`, NOW - Math.floor(random() * 29 * DAY)),
      correct: random() > 0.2,
      ms: Math.floor(random() * 15_000),
    }));
    const snapshot = buildSnapshot({ ...state, cards, attempts }, NOW, TZ);
    expect(snapshot.data.attempts).toHaveLength(15_000);
    const bytes = await encodeSnapshot(snapshot);
    expect(bytes.length).toBeLessThan(1_048_576);
  });
});

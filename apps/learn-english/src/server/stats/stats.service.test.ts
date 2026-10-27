import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { isDayInRange, statsPayloadSchema, type StatsPayload } from "./stats.schema";
import { countersOf, hashDevice, recordStats } from "./stats.service";

interface Statement {
  sql: string;
  params: unknown[];
}

/** A minimal D1Database that records batched statements (real drizzle-orm/d1 on top). */
function fakeD1() {
  const statements: Statement[] = [];
  const batches: number[] = [];
  const prepare = (sql: string) => {
    const bind = (...params: unknown[]) => ({ statement: { sql, params } });
    return { bind, ...bind() };
  };
  const d1 = {
    prepare,
    batch: async (prepared: { statement: Statement }[]) => {
      batches.push(prepared.length);
      return prepared.map(({ statement }) => {
        statements.push(statement);
        return { results: [], success: true, meta: {} };
      });
    },
  };
  const db = drizzle(d1 as unknown as D1Database, { schema }) as unknown as Db;
  return { db, statements, batches };
}

const SALT = "s".repeat(32);
const DEVICE = "0f8fad5b-d9cb-469f-a165-70867728950e";

const payload = (extra: Partial<StatsPayload> = {}): StatsPayload => ({
  day: "2026-10-27",
  deviceId: DEVICE,
  lessonsCompleted: 1,
  placementDone: false,
  exercises: { mcq: 12, listening: 0, "word-order": 3 },
  wrongWords: { "word:cat-n": 2 },
  ...extra,
});

describe("countersOf", () => {
  it("skips zero counts and maps each metric to its key", () => {
    expect(countersOf(payload())).toEqual([
      { metric: "lesson_completed", key: "", count: 1 },
      { metric: "exercise", key: "mcq", count: 12 },
      { metric: "exercise", key: "word-order", count: 3 },
      { metric: "word_wrong", key: "word:cat-n", count: 2 },
    ]);
    expect(countersOf(payload({ lessonsCompleted: 0, placementDone: true, exercises: {}, wrongWords: {} }))).toEqual([
      { metric: "placement_done", key: "", count: 1 },
    ]);
  });

  it("keeps only the 20 most-missed words", () => {
    const wrongWords = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`word:w${String(i).padStart(2, "0")}`, i + 1]));
    const words = countersOf(payload({ wrongWords })).filter((c) => c.metric === "word_wrong");
    expect(words).toHaveLength(20);
    expect(words[0]).toEqual({ metric: "word_wrong", key: "word:w29", count: 30 });
    expect(words.at(-1)).toEqual({ metric: "word_wrong", key: "word:w10", count: 11 });
  });
});

describe("hashDevice", () => {
  it("is a SHA-256 hex that changes with the day and the salt", async () => {
    const a = await hashDevice(DEVICE, "2026-10-27", SALT);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashDevice(DEVICE, "2026-10-27", SALT)).toBe(a);
    expect(await hashDevice(DEVICE, "2026-10-28", SALT)).not.toBe(a);
    expect(await hashDevice(DEVICE, "2026-10-27", "t".repeat(32))).not.toBe(a);
  });
});

describe("recordStats", () => {
  it("writes the device hash and every counter in one batch", async () => {
    const { db, statements, batches } = fakeD1();
    await recordStats(db, payload(), SALT);

    expect(batches).toEqual([5]);
    const [device, ...upserts] = statements;
    expect(device.sql).toMatch(/^insert into "stats_devices".*on conflict do nothing$/i);
    expect(device.params).toEqual(["2026-10-27", await hashDevice(DEVICE, "2026-10-27", SALT)]);
    for (const upsert of upserts) {
      expect(upsert.sql).toMatch(/^insert into "stats_daily"/i);
      expect(upsert.sql).toMatch(/on conflict \("stats_daily"."day", "stats_daily"."metric", "stats_daily"."key"\) do update set "count" = "stats_daily"."count" \+ excluded.count/i);
    }
    expect(upserts.map((s) => s.params)).toEqual([
      ["2026-10-27", "lesson_completed", "", 1],
      ["2026-10-27", "exercise", "mcq", 12],
      ["2026-10-27", "exercise", "word-order", 3],
      ["2026-10-27", "word_wrong", "word:cat-n", 2],
    ]);
  });

  it("never stores the raw device id", async () => {
    const { db, statements } = fakeD1();
    await recordStats(db, payload(), SALT);
    expect(JSON.stringify(statements)).not.toContain(DEVICE);
  });
});

describe("statsPayloadSchema", () => {
  it("accepts a valid report", () => {
    expect(statsPayloadSchema.safeParse(payload()).success).toBe(true);
  });

  it.each([
    ["an unknown exercise kind", { exercises: { study: 1 } }],
    ["a bad word id", { wrongWords: { "grammar:x": 1 } }],
    ["a zero wrong count", { wrongWords: { "word:cat-n": 0 } }],
    ["too many lessons", { lessonsCompleted: 21 }],
    ["a huge exercise count", { exercises: { mcq: 2001 } }],
    ["a malformed day", { day: "2026-13-01" }],
    ["a short device id", { deviceId: "abc" }],
  ])("rejects %s", (_, extra) => {
    expect(statsPayloadSchema.safeParse({ ...payload(), ...extra }).success).toBe(false);
  });
});

describe("isDayInRange", () => {
  const now = Date.parse("2026-10-27T23:00:00Z");
  it("allows two days either side of the UTC day", () => {
    expect(isDayInRange("2026-10-25", now)).toBe(true);
    expect(isDayInRange("2026-10-29", now)).toBe(true);
    expect(isDayInRange("2026-10-24", now)).toBe(false);
    expect(isDayInRange("2026-10-30", now)).toBe(false);
  });
});

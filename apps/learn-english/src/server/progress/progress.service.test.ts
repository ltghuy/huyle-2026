// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { isoWeek } from "@/lib/iso-week";
import { getProgress, hashAccountDevice, putProgress } from "./progress.service";

const NOW = Date.parse("2026-11-03T10:00:00Z"); // Tuesday of ISO week 45
const OPTS = { now: NOW, maxBytes: 1024, salt: "s".repeat(32) };
const blob = (text: string) => Buffer.from(text).toString("base64");
const body = (rev: number, text = "progress", extra: Partial<{ deviceId: string; countMe: boolean }> = {}) => ({
  rev,
  data: blob(text),
  deviceId: "device-aaaa",
  countMe: true,
  ...extra,
});

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('u1', 'Minh Anh', 'minh@example.com', ${NOW}, ${NOW})`);
});

const activity = () => sqlite.prepare("SELECT week, device_hash FROM account_activity WHERE user_id = 'u1' ORDER BY week, device_hash").all();
const optOut = () => (sqlite.prepare("SELECT stats_opt_out AS v FROM user WHERE id = 'u1'").get() as { v: number }).v;

describe("isoWeek", () => {
  it.each([
    ["2026-11-03T10:00:00Z", "2026-W45"],
    ["2026-01-01T00:00:00Z", "2026-W01"], // Thursday
    ["2027-01-01T00:00:00Z", "2026-W53"], // Friday, still the last week of 2026
    ["2024-12-30T00:00:00Z", "2025-W01"], // Monday of 2025's first week
  ])("%s is %s", (time, week) => {
    expect(isoWeek(Date.parse(time))).toBe(week);
  });
});

describe("account progress", () => {
  it("has nothing for a new account", async () => {
    expect(await getProgress(db, "u1")).toEqual({ ok: false, reason: "not-found" });
  });

  it("creates the first copy at rev 0 and reads it back", async () => {
    expect(await putProgress(db, "u1", body(0, "first"), OPTS)).toEqual({ ok: true, rev: 1 });
    expect(await getProgress(db, "u1")).toEqual({ ok: true, rev: 1, data: blob("first"), updatedAt: NOW });
  });

  it("updates when the rev matches and refuses a stale one with the stored rev", async () => {
    await putProgress(db, "u1", body(0), OPTS);
    expect(await putProgress(db, "u1", body(1, "second"), OPTS)).toEqual({ ok: true, rev: 2 });
    expect(await putProgress(db, "u1", body(1, "stale"), OPTS)).toEqual({ ok: false, reason: "conflict", rev: 2 });
    expect(await putProgress(db, "u1", body(0, "again"), OPTS)).toEqual({ ok: false, reason: "conflict", rev: 2 });
    expect((await getProgress(db, "u1")).ok && (await getProgress(db, "u1"))).toMatchObject({ data: blob("second") });
  });

  it("refuses a blob over the cap without writing", async () => {
    expect(await putProgress(db, "u1", body(0, "x".repeat(2000)), OPTS)).toEqual({ ok: false, reason: "too-large" });
    expect(await getProgress(db, "u1")).toEqual({ ok: false, reason: "not-found" });
    expect(activity()).toEqual([]);
  });

  it("records one activity row per week and device, with a hashed device id", async () => {
    await putProgress(db, "u1", body(0), OPTS);
    await putProgress(db, "u1", body(1), OPTS);
    await putProgress(db, "u1", body(2, "x", { deviceId: "device-bbbb" }), OPTS);
    await putProgress(db, "u1", body(3), { ...OPTS, now: NOW + 7 * 86_400_000 });
    const hash = await hashAccountDevice("device-aaaa", "u1", OPTS.salt);
    const other = await hashAccountDevice("device-bbbb", "u1", OPTS.salt);
    expect(activity()).toEqual([
      ...[hash, other].sort().map((device_hash) => ({ week: "2026-W45", device_hash })),
      { week: "2026-W46", device_hash: hash },
    ]);
    expect(hash).not.toContain("device-aaaa");
  });

  it("stores the learner's stats choice on the account (AC-028)", async () => {
    await putProgress(db, "u1", body(0, "x", { countMe: false }), OPTS);
    expect(optOut()).toBe(1);
    await putProgress(db, "u1", body(1, "x", { countMe: true }), OPTS);
    expect(optOut()).toBe(0);
  });
});

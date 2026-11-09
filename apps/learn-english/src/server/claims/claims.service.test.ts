// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { claimsRequestSchema, MAX_CLAIMS_PER_DAY, type ClaimsRequest } from "./claims.schema";
import { CLEANUP_LIMIT, claimStatuses, RETENTION_MS, submitClaims } from "./claims.service";

const DAY = 86_400_000;
const NOW = Date.parse("2026-11-20T10:00:00Z");
const SALT = "s".repeat(32);
const DEVICE_A = "0f8fad5b-d9cb-469f-a165-70867728950e";
const DEVICE_B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const request = (deviceId: string, ids: number[]): ClaimsRequest => ({
  deviceId,
  claims: ids.map((n) => ({ id: id(n), sentenceId: "sentence:greet-1", answer: `Answer ${n}`, source: "learner" })),
});
const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i);
const rowCount = () => (sqlite.prepare("SELECT COUNT(*) AS n FROM claims").get() as { n: number }).n;

/** Sends `count` claims from `deviceId`, 10 per request as the client does. */
async function fill(deviceId: string, from: number, count: number, now = NOW) {
  const accepted: string[] = [];
  for (let start = 0; start < count; start += 10) {
    accepted.push(...(await submitClaims(db, request(deviceId, range(from + start, Math.min(10, count - start))), SALT, now)));
  }
  return accepted;
}

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
});

describe("submitClaims (016)", () => {
  it("stores a pending claim with a hashed device id and the UTC day", async () => {
    expect(await submitClaims(db, request(DEVICE_A, [1]), SALT, NOW)).toEqual([id(1)]);
    const row = sqlite.prepare("SELECT * FROM claims").get() as Record<string, unknown>;
    expect(row).toMatchObject({ id: id(1), sentence_id: "sentence:greet-1", answer: "Answer 1", day: "2026-11-20", created_at: NOW, status: "pending", source: "learner" });
    expect(row.device_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(DEVICE_A);
  });

  it("stores who accepted the wording: the learner or AI grading (033 AC-017)", async () => {
    const ai: ClaimsRequest = { deviceId: DEVICE_A, claims: [{ id: id(2), sentenceId: "sentence:greet-1", answer: "Hi", source: "ai" }] };
    expect(await submitClaims(db, ai, SALT, NOW)).toEqual([id(2)]);
    expect(sqlite.prepare("SELECT source FROM claims WHERE id = ?").get(id(2))).toEqual({ source: "ai" });
  });

  it("defaults a claim from an older client to the learner", () => {
    const parsed = claimsRequestSchema.parse({ deviceId: DEVICE_A, claims: [{ id: id(3), sentenceId: "sentence:greet-1", answer: "Hi" }] });
    expect(parsed.claims[0]!.source).toBe("learner");
    expect(claimsRequestSchema.safeParse({ deviceId: DEVICE_A, claims: [{ id: id(3), sentenceId: "sentence:greet-1", answer: "Hi", source: "bot" }] }).success).toBe(false);
  });

  it("accepts 30 claims per device per day and refuses the 31st (AC-010)", async () => {
    expect(await fill(DEVICE_A, 1, MAX_CLAIMS_PER_DAY)).toHaveLength(MAX_CLAIMS_PER_DAY);
    expect(await submitClaims(db, request(DEVICE_A, [31, 32]), SALT, NOW)).toEqual([]);
    expect(rowCount()).toBe(MAX_CLAIMS_PER_DAY);
  });

  it("refuses only the claims past the limit within one request", async () => {
    await fill(DEVICE_A, 1, 25);
    expect(await submitClaims(db, request(DEVICE_A, range(26, 10)), SALT, NOW)).toEqual(range(26, 5).map(id));
  });

  it("accepts the same device again the next UTC day", async () => {
    await fill(DEVICE_A, 1, MAX_CLAIMS_PER_DAY);
    expect(await submitClaims(db, request(DEVICE_A, [31]), SALT, NOW + DAY)).toEqual([id(31)]);
  });

  it("counts each device on its own", async () => {
    await fill(DEVICE_A, 1, MAX_CLAIMS_PER_DAY);
    expect(await submitClaims(db, request(DEVICE_B, [31]), SALT, NOW)).toEqual([id(31)]);
  });

  it("ignores a duplicate id, keeping the first claim and reporting it accepted", async () => {
    await submitClaims(db, request(DEVICE_A, [1]), SALT, NOW);
    expect(await submitClaims(db, { deviceId: DEVICE_A, claims: [{ id: id(1), sentenceId: "sentence:other", answer: "Changed", source: "learner" }] }, SALT, NOW)).toEqual([id(1)]);
    // A resend the next day (new daily hash) must not be dropped by the device.
    expect(await submitClaims(db, request(DEVICE_A, [1]), SALT, NOW + 86_400_000)).toEqual([id(1)]);
    expect(sqlite.prepare("SELECT sentence_id, answer FROM claims").all()).toEqual([{ sentence_id: "sentence:greet-1", answer: "Answer 1" }]);
  });

  it("deletes claims decided more than 90 days ago, at most 50 per request, never pending ones", async () => {
    const insert = sqlite.prepare(
      "INSERT INTO claims (id, sentence_id, answer, device_hash, day, created_at, status, decided_at) VALUES (?, 'sentence:x', 'a', 'h', '2026-01-01', 0, ?, ?)",
    );
    const old = NOW - RETENTION_MS - 1;
    for (let n = 100; n < 100 + CLEANUP_LIMIT + 5; n++) insert.run(id(n), "approved", old);
    insert.run(id(200), "pending", null);
    insert.run(id(201), "rejected", NOW - RETENTION_MS + DAY);

    await submitClaims(db, request(DEVICE_A, [1]), SALT, NOW);
    const left = (status: string) => (sqlite.prepare("SELECT COUNT(*) AS n FROM claims WHERE status = ?").get(status) as { n: number }).n;
    expect(left("approved")).toBe(5);
    expect(left("pending")).toBe(2);
    expect(left("rejected")).toBe(1);
  });
});

describe("claimStatuses (016)", () => {
  it("answers only known ids, with the explanation only for a rejection", async () => {
    await submitClaims(db, request(DEVICE_A, [1, 2, 3, 4]), SALT, NOW);
    const decide = sqlite.prepare("UPDATE claims SET status = ?, explanation_vi = ?, decided_at = ? WHERE id = ?");
    decide.run("rejected", "Thiếu mạo từ.", NOW, id(2));
    decide.run("approved", "Không nên trả về", NOW, id(3));
    decide.run("dropped", null, NOW, id(4));

    const statuses = await claimStatuses(db, [id(1), id(2), id(3), id(4), id(99)]);
    expect([...statuses].sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: id(1), status: "pending" },
      { id: id(2), status: "rejected", explanationVi: "Thiếu mạo từ." },
      { id: id(3), status: "approved" },
      { id: id(4), status: "dropped" },
    ]);
  });
});

import { Buffer } from "node:buffer";
import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { hashSyncCode, normalizeSyncCode } from "./code";
import {
  CLEANUP_LIMIT,
  RETENTION_MS,
  createSyncProfile,
  deleteSyncProfile,
  getSyncProfile,
  putSyncProfile,
} from "./sync.service";

type Row = Record<string, unknown>;
interface Statement {
  sql: string;
  params: unknown[];
}

/** A minimal D1Database that records statements and answers each with the next queued result set. */
function fakeD1(results: Row[][]) {
  const statements: Statement[] = [];
  const batches: number[] = [];
  const next = () => results.shift() ?? [];
  const prepare = (sql: string) => {
    const bind = (...params: unknown[]) => {
      const statement = { sql, params };
      return {
        statement,
        raw: async () => {
          statements.push(statement);
          return next().map((row) => Object.values(row));
        },
        all: async () => {
          statements.push(statement);
          return { results: next() };
        },
        run: async () => {
          statements.push(statement);
          return { results: next(), meta: {} };
        },
      };
    };
    return { bind, ...bind() };
  };
  const d1 = {
    prepare,
    batch: async (prepared: { statement: Statement }[]) => {
      batches.push(prepared.length);
      return prepared.map(({ statement }) => {
        statements.push(statement);
        return { results: next(), meta: {} };
      });
    },
  };
  const db = drizzle(d1 as unknown as D1Database, { schema }) as unknown as Db;
  return { db, statements, batches };
}

const NOW = 1_800_000_000_000;
const OPTIONS = { now: NOW, maxBytes: 1024 };
const PAYLOAD = Buffer.from("gzipped snapshot bytes").toString("base64");
const HASH = "a".repeat(64);

/** Every bound value as text, to search for a leaked code. */
function boundText(statements: Statement[]): string {
  return statements
    .flatMap((s) => s.params)
    .map((p) => (p instanceof Uint8Array ? Buffer.from(p).toString("latin1") : String(p)))
    .join("|");
}

describe("createSyncProfile", () => {
  it("stores only the hash of the new code, with stale-row cleanup in the same batch", async () => {
    const { db, statements, batches } = fakeD1([[], [{ rev: 1 }]]);
    const result = await createSyncProfile(db, PAYLOAD, OPTIONS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(batches).toEqual([2]);

    const [cleanup, insert] = statements;
    expect(cleanup.sql).toMatch(/^delete from "sync_profiles" where "sync_profiles"."code_hash" in \(select/);
    expect(cleanup.sql).toMatch(/"updated_at" < \? limit \?/);
    expect(cleanup.params).toEqual([NOW - RETENTION_MS, CLEANUP_LIMIT]);

    expect(insert.sql).toMatch(/^insert into "sync_profiles"/);
    expect(insert.sql).toMatch(/on conflict do nothing returning "rev"/);
    const hash = await hashSyncCode(normalizeSyncCode(result.code)!);
    expect(insert.params[0]).toBe(hash);
    expect(insert.params).toContain(1); // rev
    expect(insert.params).toContain(NOW);

    const raw = normalizeSyncCode(result.code)!;
    const stored = boundText(statements);
    expect(stored).not.toContain(raw);
    expect(stored).not.toContain(result.code);
  });

  it("stores the decoded bytes and their size, not the base64 text", async () => {
    const { db, statements } = fakeD1([[], [{ rev: 1 }]]);
    await createSyncProfile(db, PAYLOAD, OPTIONS);
    const insert = statements[1];
    const blob = insert.params.find((p) => p instanceof Uint8Array) as Uint8Array;
    expect(Buffer.from(blob).toString()).toBe("gzipped snapshot bytes");
    expect(insert.params).toContain(blob.byteLength);
  });

  it("retries once with a new code when the first one collides", async () => {
    const { db, statements, batches } = fakeD1([[], [], [], [{ rev: 1 }]]);
    const result = await createSyncProfile(db, PAYLOAD, OPTIONS);
    expect(result.ok).toBe(true);
    expect(batches).toEqual([2, 2]);
    expect(statements[1].params[0]).not.toBe(statements[3].params[0]);
  });

  it("refuses a payload over the byte cap without touching D1", async () => {
    const { db, statements } = fakeD1([]);
    const big = Buffer.alloc(1025).toString("base64");
    expect(await createSyncProfile(db, big, OPTIONS)).toEqual({ ok: false, reason: "too-large" });
    expect(statements).toHaveLength(0);
  });

  it("accepts a payload of exactly the cap", async () => {
    const { db } = fakeD1([[], [{ rev: 1 }]]);
    const exact = Buffer.alloc(1024).toString("base64");
    expect((await createSyncProfile(db, exact, OPTIONS)).ok).toBe(true);
  });
});

describe("getSyncProfile", () => {
  it("returns rev, base64 data and updatedAt", async () => {
    const bytes = Buffer.from("blob");
    const { db, statements } = fakeD1([[{ rev: 4, data: [...bytes], updatedAt: NOW }]]);
    expect(await getSyncProfile(db, HASH)).toEqual({ ok: true, rev: 4, data: bytes.toString("base64"), updatedAt: NOW });
    expect(statements[0].sql).toMatch(/where "sync_profiles"."code_hash" = \?/);
    expect(statements[0].params).toEqual([HASH, 1]);
  });

  it("reports an unknown code as not found", async () => {
    const { db } = fakeD1([[]]);
    expect(await getSyncProfile(db, HASH)).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("putSyncProfile", () => {
  it("updates only when the stored rev matches, bumping it in one batch", async () => {
    const { db, statements, batches } = fakeD1([[{ rev: 6 }], [{ rev: 6 }]]);
    expect(await putSyncProfile(db, HASH, { rev: 5, data: PAYLOAD }, OPTIONS)).toEqual({ ok: true, rev: 6 });
    expect(batches).toEqual([2]);
    const [update] = statements;
    expect(update.sql).toMatch(/^update "sync_profiles" set "data" = \?, "rev" = "sync_profiles"."rev" \+ 1, "size" = \?, "updated_at" = \?/);
    expect(update.sql).toMatch(/where \("sync_profiles"."code_hash" = \? and "sync_profiles"."rev" = \?\) returning "rev"/);
    expect(update.params.slice(-2)).toEqual([HASH, 5]);
  });

  it("answers a stale rev with a conflict carrying the stored rev", async () => {
    const { db } = fakeD1([[], [{ rev: 8 }]]);
    expect(await putSyncProfile(db, HASH, { rev: 7, data: PAYLOAD }, OPTIONS)).toEqual({
      ok: false,
      reason: "conflict",
      rev: 8,
    });
  });

  it("reports an unknown code as not found", async () => {
    const { db } = fakeD1([[], []]);
    expect(await putSyncProfile(db, HASH, { rev: 1, data: PAYLOAD }, OPTIONS)).toEqual({ ok: false, reason: "not-found" });
  });

  it("refuses an oversized payload without touching D1", async () => {
    const { db, statements } = fakeD1([]);
    const big = Buffer.alloc(2048).toString("base64");
    expect(await putSyncProfile(db, HASH, { rev: 1, data: big }, OPTIONS)).toEqual({ ok: false, reason: "too-large" });
    expect(statements).toHaveLength(0);
  });
});

describe("deleteSyncProfile", () => {
  it("deletes the row by hash", async () => {
    const { db, statements } = fakeD1([[{ codeHash: HASH }]]);
    expect(await deleteSyncProfile(db, HASH)).toBe(true);
    expect(statements[0].sql).toMatch(/^delete from "sync_profiles" where "sync_profiles"."code_hash" = \? returning/);
    expect(statements[0].params).toEqual([HASH]);
  });

  it("returns false for an unknown code", async () => {
    const { db } = fakeD1([[]]);
    expect(await deleteSyncProfile(db, HASH)).toBe(false);
  });
});

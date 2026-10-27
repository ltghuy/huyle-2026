import { drizzle } from "drizzle-orm/d1";
import { describe, expect, it } from "vitest";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { getContentItems, getContentVersion } from "./content.service";

type Row = Record<string, unknown>;
interface Statement {
  sql: string;
  params: unknown[];
}

/**
 * A minimal D1Database: records every statement and answers each with the next
 * queued result set. Rows are objects whose keys follow the SELECT order, like
 * D1's own results (Drizzle maps them by position).
 */
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
        return { results: next() };
      });
    },
  };
  const db = drizzle(d1 as unknown as D1Database, { schema }) as unknown as Db;
  return { db, statements, batches };
}

const meta = { version: 7, publishedAt: 1_700_000_000_000 };
const row = (id: string, extra: Row = {}) => ({
  id,
  kind: "word",
  level: "A1",
  topic: null,
  sort: 0,
  body: JSON.stringify({ headword: id }),
  ...extra,
});

describe("getContentVersion", () => {
  it("returns the published version", async () => {
    const { db } = fakeD1([[meta]]);
    expect(await getContentVersion(db)).toEqual(meta);
  });

  it("returns version 0 before the first publish", async () => {
    const { db } = fakeD1([[]]);
    expect(await getContentVersion(db)).toEqual({ version: 0, publishedAt: 0 });
  });
});

describe("getContentItems", () => {
  it("reads the version, live items and tombstones in one batch", async () => {
    const { db, statements, batches } = fakeD1([
      [meta],
      [row("word:apple", { topic: "food", sort: 1 }), row("word:book", { sort: 2 })],
      [{ id: "word:old" }],
    ]);

    const result = await getContentItems(db, { kind: "word", level: "A1" });

    expect(batches).toEqual([3]);
    expect(statements).toHaveLength(3);
    expect(result).toEqual({
      version: 7,
      items: [
        { id: "word:apple", kind: "word", level: "A1", topic: "food", sort: 1, body: { headword: "word:apple" } },
        { id: "word:book", kind: "word", level: "A1", sort: 2, body: { headword: "word:book" } },
      ],
      tombstones: ["word:old"],
    });
  });

  it("filters by kind, level and the deleted flag, ordered by sort then id", async () => {
    const { db, statements } = fakeD1([[meta], [], []]);
    await getContentItems(db, { kind: "word", level: "B1" });

    const [, items, removed] = statements;
    expect(items.sql).toMatch(/where .*"kind" = \?.*"level" = \?.*"deleted" = \?/);
    expect(items.sql).toMatch(/order by .*"level".*"sort".*"id"/);
    expect(items.params).toEqual(["word", "B1", 0]);
    expect(removed.params).toEqual(["word", "B1", 1]);
  });

  it("reads every level when none is given", async () => {
    const { db, statements } = fakeD1([[meta], [row("grammar:be", { kind: "grammar" })], []]);
    const result = await getContentItems(db, { kind: "grammar" });

    expect(statements[1].sql).not.toMatch(/"level" = \?/);
    expect(statements[1].params).toEqual(["grammar", 0]);
    expect(result.items.map((item) => item.id)).toEqual(["grammar:be"]);
  });

  it("reports version 0 when nothing is published", async () => {
    const { db } = fakeD1([[], [], []]);
    expect(await getContentItems(db, { kind: "placement" })).toEqual({ version: 0, items: [], tombstones: [] });
  });
});

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { drizzle } from "drizzle-orm/d1";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";

// A real SQLite database (Node's built-in `node:sqlite`, in memory) behind the
// slice of the D1 API that Drizzle's D1 driver calls, with the app's
// migrations applied. For service tests whose SQL must actually run, such as
// the leaderboard ranking; tests that only check which statements were sent
// can keep using a recording fake.

const MIGRATIONS = join(import.meta.dirname, "../../migrations");

function statement(db: DatabaseSync, sql: string, params: SQLInputValue[] = []) {
  const rows = () => db.prepare(sql).all(...params) as Record<string, unknown>[];
  return {
    bind: (...next: SQLInputValue[]) => statement(db, sql, next),
    all: async () => ({ results: rows(), success: true, meta: {} }),
    raw: async () => rows().map((row) => Object.values(row)),
    first: async () => rows()[0] ?? null,
    run: async () => {
      const { changes } = db.prepare(sql).run(...params);
      return { results: [], success: true, meta: { changes: Number(changes) } };
    },
  };
}

/** A Drizzle client over a fresh in-memory database, plus the raw database for setup and checks. */
export function sqliteDb(): { db: Db; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql")).sort()) {
    for (const sql of readFileSync(join(MIGRATIONS, file), "utf8").split("--> statement-breakpoint")) sqlite.exec(sql);
  }
  const d1 = {
    prepare: (sql: string) => statement(sqlite, sql),
    batch: async (statements: ReturnType<typeof statement>[]) => {
      // D1 runs a batch as one transaction.
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const item of statements) results.push(await item.all());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db: drizzle(d1 as unknown as D1Database, { schema }) as unknown as Db, sqlite };
}

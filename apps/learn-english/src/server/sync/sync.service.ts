import "server-only";
import { Buffer } from "node:buffer";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { syncProfiles } from "@/server/db/schema";
import { generateSyncCode, hashSyncCode, normalizeSyncCode } from "./code";

// Sync rows hold an opaque blob (the browser's gzipped snapshot): the server
// only counts its bytes and never decodes or parses it. Rows are addressed by
// SHA-256 of the normalised code, so the code itself is never stored.

const DAY_MS = 86_400_000;
/** Rows nobody touched for this long are deleted (12-month retention). */
export const RETENTION_MS = 365 * DAY_MS;
/** At most this many stale rows are deleted per create, to keep the request cheap. */
export const CLEANUP_LIMIT = 100;

export interface SyncOptions {
  now: number;
  maxBytes: number;
}

export type CreateResult = { ok: true; code: string } | { ok: false; reason: "too-large" };
export type GetResult = { ok: true; rev: number; data: string; updatedAt: number } | { ok: false; reason: "not-found" };
export type PutResult =
  | { ok: true; rev: number }
  | { ok: false; reason: "not-found" | "too-large" }
  | { ok: false; reason: "conflict"; rev: number };

/** Decoded size check; `null` when the payload is over the cap. */
function decode(base64: string, maxBytes: number): Buffer | null {
  const bytes = Buffer.from(base64, "base64");
  return bytes.byteLength > maxBytes ? null : bytes;
}

function staleRowsCleanup(db: Db, now: number) {
  // SQLite in D1 has no DELETE … LIMIT, so the limit goes in a subquery.
  return db.delete(syncProfiles).where(
    inArray(
      syncProfiles.codeHash,
      db
        .select({ codeHash: syncProfiles.codeHash })
        .from(syncProfiles)
        .where(lt(syncProfiles.updatedAt, now - RETENTION_MS))
        .limit(CLEANUP_LIMIT),
    ),
  );
}

/**
 * Stores a new row under a fresh code and returns the code. Stale rows are
 * cleaned up in the same batch. A code collision (60 random bits, so in
 * practice never) is retried once with another code.
 */
export async function createSyncProfile(db: Db, base64: string, { now, maxBytes }: SyncOptions): Promise<CreateResult> {
  const data = decode(base64, maxBytes);
  if (!data) return { ok: false, reason: "too-large" };

  for (let attempt = 0; attempt < 2; attempt++) {
    const code = generateSyncCode();
    const codeHash = await hashSyncCode(normalizeSyncCode(code)!);
    const insert = db
      .insert(syncProfiles)
      .values({ codeHash, data, rev: 1, size: data.byteLength, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning({ rev: syncProfiles.rev });
    const [, inserted] = await db.batch([staleRowsCleanup(db, now), insert]);
    if (inserted.length > 0) return { ok: true, code };
  }
  throw new Error("Sync code collided twice");
}

export async function getSyncProfile(db: Db, codeHash: string): Promise<GetResult> {
  const [row] = await db
    .select({ rev: syncProfiles.rev, data: syncProfiles.data, updatedAt: syncProfiles.updatedAt })
    .from(syncProfiles)
    .where(eq(syncProfiles.codeHash, codeHash))
    .limit(1);
  if (!row) return { ok: false, reason: "not-found" };
  return { ok: true, rev: row.rev, data: Buffer.from(row.data).toString("base64"), updatedAt: row.updatedAt };
}

/**
 * Replaces the blob only when the stored `rev` is still the one the client
 * read (one conditional UPDATE, no transaction). The follow-up SELECT in the
 * same batch tells a stale rev (409 with the current one) from an unknown code.
 */
export async function putSyncProfile(
  db: Db,
  codeHash: string,
  { rev, data: base64 }: { rev: number; data: string },
  { now, maxBytes }: SyncOptions,
): Promise<PutResult> {
  const data = decode(base64, maxBytes);
  if (!data) return { ok: false, reason: "too-large" };

  const [updated, current] = await db.batch([
    db
      .update(syncProfiles)
      .set({ data, rev: sql`${syncProfiles.rev} + 1`, size: data.byteLength, updatedAt: now })
      .where(and(eq(syncProfiles.codeHash, codeHash), eq(syncProfiles.rev, rev)))
      .returning({ rev: syncProfiles.rev }),
    db.select({ rev: syncProfiles.rev }).from(syncProfiles).where(eq(syncProfiles.codeHash, codeHash)).limit(1),
  ]);
  if (updated[0]) return { ok: true, rev: updated[0].rev };
  if (!current[0]) return { ok: false, reason: "not-found" };
  return { ok: false, reason: "conflict", rev: current[0].rev };
}

/** Deletes the row; false when there was none. */
export async function deleteSyncProfile(db: Db, codeHash: string): Promise<boolean> {
  const deleted = await db
    .delete(syncProfiles)
    .where(eq(syncProfiles.codeHash, codeHash))
    .returning({ codeHash: syncProfiles.codeHash });
  return deleted.length > 0;
}

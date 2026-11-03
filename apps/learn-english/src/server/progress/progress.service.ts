import "server-only";
import { Buffer } from "node:buffer";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { accountActivity, accountProgress, user } from "@/server/db/schema";
import { isoWeek } from "@/lib/iso-week";
import type { PutProgressBody } from "./progress.schema";

// A signed-in learner's progress (feature 022): one opaque blob per account, the browser's gzipped
// snapshot, merged on the device. The server only counts its bytes, as for sync codes.

export interface ProgressOptions {
  now: number;
  maxBytes: number;
  /** STATS_SALT, for the device hash in `account_activity`. */
  salt: string;
}

export type GetResult = { ok: true; rev: number; data: string; updatedAt: number } | { ok: false; reason: "not-found" };
export type PutResult = { ok: true; rev: number } | { ok: false; reason: "too-large" } | { ok: false; reason: "conflict"; rev: number };

/** SHA-256 hex of device id + account id + salt: stable per account and device, meaningless without both. */
export async function hashAccountDevice(deviceId: string, userId: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${deviceId}|${userId}|${salt}`));
  return Buffer.from(digest).toString("hex");
}

export async function getProgress(db: Db, userId: string): Promise<GetResult> {
  const [row] = await db
    .select({ rev: accountProgress.rev, data: accountProgress.data, updatedAt: accountProgress.updatedAt })
    .from(accountProgress)
    .where(eq(accountProgress.userId, userId))
    .limit(1);
  if (!row) return { ok: false, reason: "not-found" };
  return { ok: true, rev: row.rev, data: Buffer.from(row.data).toString("base64"), updatedAt: row.updatedAt };
}

/**
 * Writes the account's blob when `rev` is still the stored one (0 creates the first copy), in one
 * batch that also records this week's activity for the device and the learner's stats choice.
 * A stale `rev` gives a conflict with the stored one, so the device merges and tries again.
 */
export async function putProgress(db: Db, userId: string, body: PutProgressBody, { now, maxBytes, salt }: ProgressOptions): Promise<PutResult> {
  const data = Buffer.from(body.data, "base64");
  if (data.byteLength > maxBytes) return { ok: false, reason: "too-large" };

  const write =
    body.rev === 0
      ? db
          .insert(accountProgress)
          .values({ userId, data, rev: 1, size: data.byteLength, createdAt: now, updatedAt: now })
          .onConflictDoNothing()
          .returning({ rev: accountProgress.rev })
      : db
          .update(accountProgress)
          .set({ data, rev: sql`${accountProgress.rev} + 1`, size: data.byteLength, updatedAt: now })
          .where(and(eq(accountProgress.userId, userId), eq(accountProgress.rev, body.rev)))
          .returning({ rev: accountProgress.rev });
  const deviceHash = await hashAccountDevice(body.deviceId, userId, salt);

  const [written, current] = await db.batch([
    write,
    db.select({ rev: accountProgress.rev }).from(accountProgress).where(eq(accountProgress.userId, userId)).limit(1),
    db.insert(accountActivity).values({ userId, week: isoWeek(now), deviceHash }).onConflictDoNothing(),
    // Only when the choice changed, so a normal sync writes no user row.
    db.update(user).set({ statsOptOut: !body.countMe }).where(and(eq(user.id, userId), ne(user.statsOptOut, !body.countMe))),
  ]);
  if (written[0]) return { ok: true, rev: written[0].rev };
  return { ok: false, reason: "conflict", rev: current[0]?.rev ?? 0 };
}

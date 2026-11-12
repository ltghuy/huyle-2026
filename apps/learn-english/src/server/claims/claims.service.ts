import "server-only";
import { and, inArray, lt, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { claims } from "@/server/db/schema";
import { hashDevice } from "@/server/stats/stats.service";
import { MAX_CLAIMS_PER_DAY, type ClaimsRequest, type ClaimStatusEntry } from "./claims.schema";

// Translation claims (feature 016). Each request is one `db.batch()`. The
// device id is stored only as a daily hash (as in the stats), which is what
// caps a device at MAX_CLAIMS_PER_DAY claims per UTC day.

const DAY_MS = 86_400_000;
/** Decided claims are deleted this long after the decision. */
export const RETENTION_MS = 90 * DAY_MS;
/** At most this many old claims are deleted per request, to keep it cheap. */
export const CLEANUP_LIMIT = 50;

/** The UTC day (YYYY-MM-DD) of a timestamp. */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function oldClaimsCleanup(db: Db, now: number) {
  // SQLite in D1 has no DELETE … LIMIT, so the limit goes in a subquery.
  return db.delete(claims).where(
    inArray(
      claims.id,
      db
        .select({ id: claims.id })
        .from(claims)
        .where(and(ne(claims.status, "pending"), lt(claims.decidedAt, now - RETENTION_MS)))
        .limit(CLEANUP_LIMIT),
    ),
  );
}

/**
 * Stores the claims and returns the ids now stored.
 * Each insert runs only while the device has fewer than MAX_CLAIMS_PER_DAY
 * claims that day; statements in a batch run in order, so each insert counts
 * the ones before it. An id that already exists is left as it is and reported
 * accepted: a device resending yesterday's claim (its daily hash has changed)
 * must not drop it, and ids are random UUIDs made on the device. Claims
 * decided more than RETENTION_MS ago are deleted in the same batch.
 */
export async function submitClaims(db: Db, input: ClaimsRequest, salt: string, now: number): Promise<string[]> {
  const day = utcDay(now);
  const deviceHash = await hashDevice(input.deviceId, day, salt);
  // A raw `db.run` can't go in a D1 batch, so the conditional insert is an
  // INSERT … SELECT whose SELECT is raw SQL; ON CONFLICT DO NOTHING keeps an
  // existing id as it is.
  const inserts = input.claims.map((claim) =>
    db
      .insert(claims)
      .select(
        sql`SELECT ${claim.id}, ${claim.sentenceId}, ${claim.answer}, ${deviceHash}, ${day}, ${now}, 'pending', NULL, NULL, ${claim.source}, ${claim.aiExplanationVi || null}
          WHERE (SELECT COUNT(*) FROM ${claims} WHERE ${claims.deviceHash} = ${deviceHash} AND ${claims.day} = ${day}) < ${MAX_CLAIMS_PER_DAY}`,
      )
      .onConflictDoNothing(),
  );
  const ids = input.claims.map((claim) => claim.id);
  const accepted = db
    .select({ id: claims.id })
    .from(claims)
    .where(inArray(claims.id, ids));

  // The cleanup goes first so the batch starts with a typed statement; it
  // only touches decided claims, so the order doesn't change the result.
  const results = await db.batch([oldClaimsCleanup(db, now), ...inserts, accepted]);
  const rows = results[results.length - 1] as { id: string }[];
  const stored = new Set(rows.map((row) => row.id));
  return ids.filter((id) => stored.has(id));
}

/** The status of each known claim; unknown ids are left out. The explanation comes only with a rejection. */
export async function claimStatuses(db: Db, ids: string[]): Promise<ClaimStatusEntry[]> {
  const rows = await db
    .select({ id: claims.id, status: claims.status, explanationVi: claims.explanationVi })
    .from(claims)
    .where(inArray(claims.id, ids));
  return rows.map(({ id, status, explanationVi }) =>
    status === "rejected" && explanationVi ? { id, status, explanationVi } : { id, status },
  );
}

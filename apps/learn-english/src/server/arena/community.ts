// "Cộng đồng" (feature 041): the D1 list of public Arena lobbies. Each room writes and deletes
// its own row (`ArenaRoom`); the community route reads them. `db` is passed in, as in `stats.ts`:
// the room has no Next.js request context.
//
// No `import "server-only"`: the room, bundled into `worker.ts`, imports this module.
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import type { CommunityListing } from "@/learning/arena/community";
import { settingsSchema } from "@/learning/arena/protocol";
import { teamSettingsSchema } from "@/learning/arena/team-protocol";
import type { Db } from "@/server/db";
import { arenaCommunity } from "@/server/db/schema";
import type { CommunityQuery, CommunityRoom } from "./arena.schema";

/** A row its room hasn't touched for this long is treated as gone (edge case: the room failed mid-write). */
export const COMMUNITY_TTL_MS = 2 * 60 * 60 * 1_000;
/** Most rooms one load shows (edge case). */
export const COMMUNITY_LIMIT = 50;

/** Adds or replaces a room's row, and prunes rows left behind by rooms that never removed theirs, in one batch. */
export async function writeListing(db: Db, listing: CommunityListing, now: number): Promise<void> {
  const changes = {
    kind: listing.kind,
    level: listing.level,
    hostId: listing.host.id,
    hostName: listing.host.name,
    hostImage: listing.host.image,
    settings: JSON.stringify(listing.settings),
    taken: listing.taken,
    seats: listing.seats,
    updatedAt: now,
  };
  await db.batch([
    db.insert(arenaCommunity).values({ code: listing.code, ...changes }).onConflictDoUpdate({ target: arenaCommunity.code, set: changes }),
    db.delete(arenaCommunity).where(lt(arenaCommunity.updatedAt, now - COMMUNITY_TTL_MS)),
  ]);
}

/** Takes a room off the list (full, started, closed). */
export async function removeListing(db: Db, code: string): Promise<void> {
  await db.delete(arenaCommunity).where(eq(arenaCommunity.code, code));
}

const storedSettings = { duel: settingsSchema, team: teamSettingsSchema } as const;

/** The listed rooms matching the filters, newest first, at most {@link COMMUNITY_LIMIT} (AC-007, AC-008). */
export async function listCommunity(db: Db, query: CommunityQuery, now: number): Promise<CommunityRoom[]> {
  const rows = await db
    .select()
    .from(arenaCommunity)
    .where(
      and(
        gt(arenaCommunity.updatedAt, now - COMMUNITY_TTL_MS),
        query.kind ? eq(arenaCommunity.kind, query.kind) : undefined,
        query.level ? eq(arenaCommunity.level, query.level) : undefined,
      ),
    )
    .orderBy(desc(arenaCommunity.updatedAt), desc(arenaCommunity.code))
    .limit(COMMUNITY_LIMIT);
  return rows.flatMap((row): CommunityRoom[] => {
    if (row.kind !== "duel" && row.kind !== "team") return [];
    // A row the current settings schema can't read is skipped, not shown half-filled.
    const settings = storedSettings[row.kind].safeParse(parseJson(row.settings));
    if (!settings.success) return [];
    const base = { code: row.code, host: { id: row.hostId, name: row.hostName, image: row.hostImage }, taken: row.taken, seats: row.seats, updatedAt: row.updatedAt };
    return row.kind === "team"
      ? [{ ...base, kind: "team", settings: settings.data as z.infer<typeof teamSettingsSchema> }]
      : [{ ...base, kind: "duel", settings: settings.data as z.infer<typeof settingsSchema> }];
  });
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

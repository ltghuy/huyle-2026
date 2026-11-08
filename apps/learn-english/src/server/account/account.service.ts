import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { arenaMatches, user } from "@/server/db/schema";

/**
 * Deletes the account and everything that belongs to it (feature 022, AC-023), in one batch: the
 * foreign keys cascade to its sessions, Google link, progress, activity, board entry, Arena
 * history, and its friendships, friend requests, presence and notifications on both sides (feature 031). Other learners keep their matches against it, but without its name and picture
 * (feature 025): `ON DELETE SET NULL` only clears the opponent id, so they are blanked first.
 * False when there was no such account.
 */
export async function deleteAccount(db: Db, userId: string): Promise<boolean> {
  const [, deleted] = await db.batch([
    db.update(arenaMatches).set({ opponentName: null, opponentImage: null }).where(eq(arenaMatches.opponentId, userId)),
    db.delete(user).where(eq(user.id, userId)).returning({ id: user.id }),
  ]);
  return deleted.length > 0;
}

import "server-only";
import { and, desc, eq, gt, ne } from "drizzle-orm";
import type { Db } from "@/server/db";
import { friendships, presence, user } from "@/server/db/schema";
import { ONLINE_WINDOW_MS } from "@/server/social/social.schema";
import type { OnlineLearner } from "./arena.schema";
import type { RoomStatus } from "./room";

// "Đang trực tuyến" (feature 045): who the host of a room opened from Cộng đồng can invite.
// Online means what the friends' green dot means (feature 031): seen within the window and
// the last tab hasn't said goodbye. One D1 query; the presence table has a row per learner.

/** How many learners the list shows, most recently active first (AC-005). */
export const ONLINE_LIMIT = 30;

/** Whether `status` is a waiting room from Cộng đồng that `userId` hosts: only its host sees the list. */
export function mayListOnline(status: RoomStatus | null, userId: string): boolean {
  return status !== null && status.fromCommunity === true && status.creatorId === userId && status.phase === "lobby";
}

/** Everyone else online now, newest first, each marked as the host's friend or not. */
export async function listOnline(db: Db, me: string, now: number): Promise<OnlineLearner[]> {
  const rows = await db
    .select({ id: user.id, name: user.name, image: user.image, lastSeenAt: presence.lastSeenAt, friendId: friendships.friendId })
    .from(presence)
    .innerJoin(user, eq(user.id, presence.userId))
    .leftJoin(friendships, and(eq(friendships.userId, me), eq(friendships.friendId, presence.userId)))
    .where(and(ne(presence.userId, me), eq(presence.left, false), gt(presence.lastSeenAt, now - ONLINE_WINDOW_MS)))
    .orderBy(desc(presence.lastSeenAt))
    .limit(ONLINE_LIMIT);
  return rows.map((row) => ({ id: row.id, name: row.name, image: row.image, isFriend: row.friendId !== null, lastSeenAt: row.lastSeenAt }));
}

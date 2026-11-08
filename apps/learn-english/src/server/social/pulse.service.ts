import "server-only";
import type { Db } from "@/server/db";
import { friendsQuery, incomingQuery, outgoingQuery, pruneDeclined, toFriends } from "./friends.service";
import { unreadQuery } from "./notifications.service";
import { touchPresence } from "./presence.service";
import type { PulseResponse } from "./social.schema";

/**
 * One tab's check-in (feature 031): marks the learner active and returns their friends with
 * presence, the request ids their Arena cards need and the bell's unread count, in one batch.
 * Declined requests past their 7 days are deleted on the way (the privacy page says so).
 */
export async function pulse(db: Db, me: string, now: number): Promise<PulseResponse> {
  const [, , friends, outgoing, incoming, unread] = await db.batch([
    touchPresence(db, me, now),
    pruneDeclined(db, me, now),
    friendsQuery(db, me),
    outgoingQuery(db, me, now),
    incomingQuery(db, me),
    unreadQuery(db, me, now),
  ]);
  return {
    now,
    friends: toFriends(friends, now),
    outgoing: outgoing.map((row) => row.id),
    incoming: incoming.map((row) => row.id),
    unread: Number(unread[0]?.count ?? 0),
  };
}

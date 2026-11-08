import "server-only";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { friendRequests, friendships, notifications, presence, user } from "@/server/db/schema";
import { isOnline } from "./presence.service";
import { dropRequestNotification, pruneNotifications, upsertNotification } from "./notifications.service";
import { DECLINE_COOLDOWN_MS, MAX_PENDING, type Friend, type RequestState, type RespondState } from "./social.schema";

// Friend requests and friendships (feature 031). A request is read and written in two D1 calls
// (one read batch, one write batch): D1 has no interactive transactions, and every write
// statement below is safe to run twice, so a race between two taps ends in the same state.

export type SendResult = { ok: true; state: RequestState } | { ok: false; reason: "self" | "notFound" | "tooMany" };
export type RespondResult = { ok: true; state: RespondState } | { ok: false; reason: "gone" };

const between = (a: string, b: string) => and(eq(friendRequests.fromId, a), eq(friendRequests.toId, b));

/** Sends a request, or accepts the other learner's waiting one (AC-008). */
export async function sendRequest(db: Db, me: string, target: string, now: number): Promise<SendResult> {
  if (me === target) return { ok: false, reason: "self" };
  const [found, friends, mine, theirs, waiting] = await db.batch([
    db.select({ id: user.id }).from(user).where(eq(user.id, target)).limit(1),
    db
      .select({ id: friendships.friendId })
      .from(friendships)
      .where(and(eq(friendships.userId, me), eq(friendships.friendId, target)))
      .limit(1),
    db.select({ status: friendRequests.status, updatedAt: friendRequests.updatedAt }).from(friendRequests).where(between(me, target)).limit(1),
    db.select({ status: friendRequests.status }).from(friendRequests).where(between(target, me)).limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(friendRequests)
      .where(and(eq(friendRequests.fromId, me), eq(friendRequests.status, "pending"))),
  ]);
  if (found.length === 0) return { ok: false, reason: "notFound" };
  if (friends.length > 0) return { ok: true, state: "friends" };
  if (theirs[0]?.status === "pending") {
    await acceptRequest(db, me, target, now);
    return { ok: true, state: "friends" };
  }
  const previous = mine[0];
  if (previous?.status === "pending") return { ok: true, state: "sent" };
  // Declined less than 7 days ago: the sender keeps seeing "Đã gửi lời mời" and nothing is sent.
  if (previous?.status === "declined" && previous.updatedAt > now - DECLINE_COOLDOWN_MS) return { ok: true, state: "sent" };
  if ((waiting[0]?.count ?? 0) >= MAX_PENDING) return { ok: false, reason: "tooMany" };
  await db.batch([
    db
      .insert(friendRequests)
      .values({ fromId: me, toId: target, status: "pending", updatedAt: now })
      .onConflictDoUpdate({ target: [friendRequests.fromId, friendRequests.toId], set: { status: "pending", updatedAt: now } }),
    pruneNotifications(db, target, now),
    upsertNotification(db, target, "friend_request", me, now),
  ]);
  return { ok: true, state: "sent" };
}

/**
 * Makes `receiver` and `sender` friends (AC-005): the requests go, both rows are written, the
 * receiver's request notification becomes "Bạn và {tên} đã là bạn bè", and the sender is told
 * (AC-028). Older friend notices between the two are replaced so the unique key holds.
 */
async function acceptRequest(db: Db, receiver: string, sender: string, now: number): Promise<void> {
  await db.batch([
    db.delete(friendRequests).where(or(between(sender, receiver), between(receiver, sender))),
    db
      .insert(friendships)
      .values([
        { userId: receiver, friendId: sender, createdAt: now },
        { userId: sender, friendId: receiver, createdAt: now },
      ])
      .onConflictDoNothing(),
    db
      .delete(notifications)
      .where(and(eq(notifications.userId, receiver), eq(notifications.actorId, sender), eq(notifications.kind, "friend_added"))),
    db
      .update(notifications)
      .set({ kind: "friend_added" })
      .where(and(eq(notifications.userId, receiver), eq(notifications.actorId, sender), eq(notifications.kind, "friend_request"))),
    // The sender may have had a request of the receiver's waiting too; it is answered now.
    dropRequestNotification(db, sender, receiver),
    pruneNotifications(db, sender, now),
    upsertNotification(db, sender, "friend_accepted", receiver, now),
  ]);
}

/** Answers a request from `from` (AC-005, AC-006); "gone" when it no longer waits (AC-029). */
export async function respond(db: Db, me: string, from: string, accept: boolean, now: number): Promise<RespondResult> {
  const [request, friends] = await db.batch([
    db.select({ status: friendRequests.status }).from(friendRequests).where(between(from, me)).limit(1),
    db
      .select({ id: friendships.friendId })
      .from(friendships)
      .where(and(eq(friendships.userId, me), eq(friendships.friendId, from)))
      .limit(1),
  ]);
  if (request[0]?.status !== "pending") {
    // Accepted on another device a moment ago: same outcome, nothing to do.
    if (accept && friends.length > 0) return { ok: true, state: "friends" };
    return { ok: false, reason: "gone" };
  }
  if (accept) {
    await acceptRequest(db, me, from, now);
    return { ok: true, state: "friends" };
  }
  // Declined silently (AC-006): the row stays 7 days so the sender can't ask again at once.
  await db.batch([
    db.update(friendRequests).set({ status: "declined", updatedAt: now }).where(between(from, me)),
    dropRequestNotification(db, me, from),
  ]);
  return { ok: true, state: "declined" };
}

/** Ends a friendship for both learners (AC-020); either may send a new request right away. */
export async function removeFriend(db: Db, me: string, other: string): Promise<void> {
  await db.batch([
    db
      .delete(friendships)
      .where(or(and(eq(friendships.userId, me), eq(friendships.friendId, other)), and(eq(friendships.userId, other), eq(friendships.friendId, me)))),
    db.delete(friendRequests).where(or(between(me, other), between(other, me))),
  ]);
}

/** The learner's friends with their presence, as a batch statement. */
export function friendsQuery(db: Db, me: string) {
  return db
    .select({ id: user.id, name: user.name, image: user.image, lastSeenAt: presence.lastSeenAt, left: presence.left })
    .from(friendships)
    .innerJoin(user, eq(user.id, friendships.friendId))
    .leftJoin(presence, eq(presence.userId, friendships.friendId))
    .where(eq(friendships.userId, me));
}

export function toFriends(rows: Awaited<ReturnType<typeof friendsQuery>>, now: number): Friend[] {
  return rows.map((row) => ({ id: row.id, name: row.name, image: row.image, online: isOnline(row, now), lastSeenAt: row.lastSeenAt }));
}

/** Requests the learner sent that still count (pending, or declined within 7 days), as a batch statement. */
export function outgoingQuery(db: Db, me: string, now: number) {
  return db
    .select({ id: friendRequests.toId })
    .from(friendRequests)
    .where(
      and(
        eq(friendRequests.fromId, me),
        or(eq(friendRequests.status, "pending"), and(eq(friendRequests.status, "declined"), gt(friendRequests.updatedAt, now - DECLINE_COOLDOWN_MS))),
      ),
    );
}

/** Deletes the learner's declined requests (either side) once their 7 days are over, as a batch statement. */
export function pruneDeclined(db: Db, me: string, now: number) {
  return db
    .delete(friendRequests)
    .where(
      and(
        eq(friendRequests.status, "declined"),
        lt(friendRequests.updatedAt, now - DECLINE_COOLDOWN_MS),
        or(eq(friendRequests.fromId, me), eq(friendRequests.toId, me)),
      ),
    );
}

/** Requests waiting for the learner's answer, as a batch statement. */
export function incomingQuery(db: Db, me: string) {
  return db
    .select({ id: friendRequests.fromId })
    .from(friendRequests)
    .where(and(eq(friendRequests.toId, me), eq(friendRequests.status, "pending")));
}

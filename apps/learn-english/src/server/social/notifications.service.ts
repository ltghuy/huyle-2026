import "server-only";
import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/server/db";
import { friendRequests, notifications, user } from "@/server/db/schema";
import { NOTIFICATION_LIMIT, NOTIFICATION_MAX_AGE_MS, type NotificationItem, type NotificationKind, type NotificationsResponse } from "./social.schema";

// The notification bell (feature 031): only the signed-in learner's own rows, the 50 newest of
// the last 30 days. Older rows are deleted when the learner opens the bell or receives one.

/** Deletes the learner's notifications older than 30 days, as a batch statement. */
export function pruneNotifications(db: Db, userId: string, now: number) {
  return db.delete(notifications).where(and(eq(notifications.userId, userId), lt(notifications.createdAt, now - NOTIFICATION_MAX_AGE_MS)));
}

/** Adds (or brings back as new and unread) one notification, as a batch statement. */
export function upsertNotification(db: Db, userId: string, kind: NotificationKind, actorId: string, now: number) {
  return db
    .insert(notifications)
    .values({ id: crypto.randomUUID(), userId, kind, actorId, createdAt: now, readAt: null })
    .onConflictDoUpdate({ target: [notifications.userId, notifications.kind, notifications.actorId], set: { createdAt: now, readAt: null } });
}

/** How many of the learner's recent notifications are unread, as a batch statement. */
export function unreadQuery(db: Db, userId: string, now: number) {
  return db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), gte(notifications.createdAt, now - NOTIFICATION_MAX_AGE_MS)));
}

/** The learner's newest notifications with who they're about, in one batch. */
export async function listNotifications(db: Db, userId: string, now: number): Promise<NotificationsResponse> {
  const [, rows, pending] = await db.batch([
    pruneNotifications(db, userId, now),
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
        // Not `user.id`: a batch maps rows by column name, so a second `id` would overwrite the first.
        actorId: notifications.actorId,
        actorName: user.name,
        actorImage: user.image,
      })
      .from(notifications)
      .innerJoin(user, eq(user.id, notifications.actorId))
      .where(and(eq(notifications.userId, userId), gte(notifications.createdAt, now - NOTIFICATION_MAX_AGE_MS)))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(NOTIFICATION_LIMIT),
    db
      .select({ fromId: friendRequests.fromId })
      .from(friendRequests)
      .where(and(eq(friendRequests.toId, userId), eq(friendRequests.status, "pending"))),
  ]);
  const waiting = new Set(pending.map((row) => row.fromId));
  const items: NotificationItem[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    actor: { id: row.actorId, name: row.actorName, image: row.actorImage },
    createdAt: row.createdAt,
    read: row.readAt !== null,
    pending: row.kind === "friend_request" && waiting.has(row.actorId),
  }));
  return { now, items };
}

/** Counts every notification as read (the learner opened the bell, on any device). */
export async function markAllRead(db: Db, userId: string, now: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Removes a request's notification for its receiver, as a batch statement. */
export function dropRequestNotification(db: Db, receiverId: string, senderId: string) {
  return db
    .delete(notifications)
    .where(and(eq(notifications.userId, receiverId), eq(notifications.actorId, senderId), inArray(notifications.kind, ["friend_request"])));
}

import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { user } from "@/server/db/schema";

/**
 * Deletes the account and everything that belongs to it (feature 022, AC-023): one statement, and
 * the foreign keys cascade to its sessions, Google link, progress, activity and board entry.
 * False when there was no such account.
 */
export async function deleteAccount(db: Db, userId: string): Promise<boolean> {
  const deleted = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id });
  return deleted.length > 0;
}

import "server-only";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { user } from "@/server/db/schema";
import type { AdminContactResponse } from "./social.schema";

// "Kết bạn với quản trị viên" in the bell's "Hệ thống" tab (feature 044, AC-003, AC-004): the
// first admin (oldest account) for a learner to befriend, or none when the learner is an admin.
// One D1 call: the admin and the caller's own flag, read in one batch.

export async function adminContact(db: Db, me: string): Promise<AdminContactResponse> {
  const [admins, self] = await db.batch([
    db.select({ id: user.id, name: user.name, image: user.image }).from(user).where(eq(user.isAdmin, true)).orderBy(asc(user.createdAt)).limit(1),
    db.select({ isAdmin: user.isAdmin }).from(user).where(eq(user.id, me)).limit(1),
  ]);
  const admin = admins[0];
  if (!admin || self[0]?.isAdmin) return { admin: null };
  return { admin: { id: admin.id, name: admin.name, image: admin.image ?? null } };
}

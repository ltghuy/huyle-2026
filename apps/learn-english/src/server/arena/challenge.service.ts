import "server-only";
import { and, eq } from "drizzle-orm";
import { LINK_CODE, type ChallengeFrom, type DeliveryState } from "@/learning/arena/link";
import type { SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db";
import { friendships } from "@/server/db/schema";
import type { LinkTicket } from "./arena.schema";
import { signTicket } from "./ticket";

// Challenges from the waiting room (feature 035), for the routes. The route has the
// session and D1, so it checks who may challenge whom; the friend's link only shows it.

type Rooms = CloudflareEnv["ARENA_ROOM"];
type Links = CloudflareEnv["LEARNER_LINK"];

export type ChallengeResult = { ok: true; state: DeliveryState } | { ok: false; reason: "not-friend" | "not-host" | "seat-taken" };

/** The ticket a signed-in tab opens its link with. */
export async function linkTicket(user: SessionUser, secret: string, now: number): Promise<LinkTicket> {
  return { ticket: await signTicket({ uid: user.id, name: user.name, image: user.image, code: LINK_CODE }, secret, now) };
}

async function isFriend(db: Db, me: string, other: string): Promise<boolean> {
  const rows = await db
    .select({ id: friendships.friendId })
    .from(friendships)
    .where(and(eq(friendships.userId, me), eq(friendships.friendId, other)))
    .limit(1);
  return rows.length > 0;
}

/** Shows the challenge to `friendId` when the host may send it (AC-003, AC-007, AC-008). */
export async function sendChallenge(db: Db, rooms: Rooms, links: Links, input: { code: string; friendId: string; host: ChallengeFrom }): Promise<ChallengeResult> {
  const [friend, status] = await Promise.all([isFriend(db, input.host.id, input.friendId), rooms.getByName(input.code).status()]);
  if (!friend) return { ok: false, reason: "not-friend" };
  if (!status || status.creatorId !== input.host.id || status.phase !== "lobby") return { ok: false, reason: "not-host" };
  if (status.playerIds.includes(input.friendId) || status.spectatorIds.includes(input.friendId)) return { ok: true, state: "here" };
  if (status.playerIds.length >= 2) return { ok: false, reason: "seat-taken" };
  const state = await links.getByName(input.friendId).deliver({ from: input.host, code: input.code, settings: status.settings });
  return { ok: true, state };
}

/** The host withdrew (AC-010). Harmless for anyone else: it only closes a toast from this host. */
export async function cancelChallenge(links: Links, input: { code: string; friendId: string; hostId: string }): Promise<void> {
  await links.getByName(input.friendId).cancel(input.hostId, input.code);
}

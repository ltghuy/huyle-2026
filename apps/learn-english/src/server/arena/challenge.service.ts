import "server-only";
import { and, eq } from "drizzle-orm";
import { LINK_CODE, type ChallengeFrom, type DeliveryState } from "@/learning/arena/link";
import type { SessionUser } from "@/server/auth/session";
import type { Db } from "@/server/db";
import { friendships } from "@/server/db/schema";
import type { LinkTicket } from "./arena.schema";
import type { Challenge } from "./link";
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

/**
 * Shows the challenge to `friendId` when the host may send it (035 AC-003, AC-007, AC-008). A room
 * opened from "Cộng đồng" (feature 045) may invite any learner, team rooms included (AC-002, AC-007);
 * any other room only friends, and only to a duel (AC-011).
 */
export async function sendChallenge(db: Db, rooms: Rooms, links: Links, input: { code: string; friendId: string; host: ChallengeFrom }): Promise<ChallengeResult> {
  const status = await rooms.getByName(input.code).status();
  if (!status || status.creatorId !== input.host.id || status.phase !== "lobby") return { ok: false, reason: "not-host" };
  const open = status.fromCommunity === true;
  // Team rooms take no challenges outside Cộng đồng (feature 039, Out of Scope).
  if (status.kind === "team" && !open) return { ok: false, reason: "not-host" };
  if (!open && !(await isFriend(db, input.host.id, input.friendId))) return { ok: false, reason: "not-friend" };
  if (status.playerIds.includes(input.friendId) || status.spectatorIds.includes(input.friendId)) return { ok: true, state: "here" };
  const seats = status.kind === "team" ? status.settings.size : 2;
  if (status.playerIds.length >= seats) return { ok: false, reason: "seat-taken" };
  const challenge: Challenge =
    status.kind === "team" ? { kind: "team", from: input.host, code: input.code, settings: status.settings } : { kind: "duel", from: input.host, code: input.code, settings: status.settings };
  const state = await links.getByName(input.friendId).deliver(challenge);
  return { ok: true, state };
}

/** The host withdrew (AC-010). Harmless for anyone else: it only closes a toast from this host. */
export async function cancelChallenge(links: Links, input: { code: string; friendId: string; hostId: string }): Promise<void> {
  await links.getByName(input.friendId).cancel(input.hostId, input.code);
}

// "Cộng đồng" (feature 041): which rooms the community list shows, and what it shows of them.
// Pure, so the room object and the tests share one rule: a room is listed while the host has
// made it public, it is still in the lobby and it has a free seat (AC-003, AC-004).
import type { Level } from "@/learning/types";
import type { RoomState } from "./machine";
import type { ArenaSettings } from "./protocol";
import type { TeamRoomState } from "./team-machine";
import type { TeamSettings } from "./team-protocol";

/** A duel has two seats; a team room `settings.size`. */
export const DUEL_SEATS = 2;

export type CommunityListing =
  | { kind: "duel"; code: string; level: Level; settings: ArenaSettings; host: ListedHost; taken: number; seats: number }
  | { kind: "team"; code: string; level: Level; settings: TeamSettings; host: ListedHost; taken: number; seats: number };

export interface ListedHost {
  id: string;
  name: string;
  image: string | null;
}

/** The row "Cộng đồng" shows for this room, or null when it isn't listed. */
export function listingOf(state: RoomState | TeamRoomState | null): CommunityListing | null {
  if (!state || !state.public || state.phase !== "lobby") return null;
  if ("kind" in state && state.kind === "team") {
    const host = state.players.find((p) => p.id === state.hostId);
    if (!host || state.players.length >= state.settings.size) return null;
    const { code, settings } = state;
    return { kind: "team", code, level: settings.level, settings, host: hostOf(host), taken: state.players.length, seats: settings.size };
  }
  const duel = state as RoomState;
  const host = duel.players.find((p) => p.id === duel.creatorId);
  if (!host || duel.players.length >= DUEL_SEATS) return null;
  return { kind: "duel", code: duel.code, level: duel.settings.level, settings: duel.settings, host: hostOf(host), taken: duel.players.length, seats: DUEL_SEATS };
}

function hostOf(player: { id: string; name: string; image: string | null }): ListedHost {
  return { id: player.id, name: player.name, image: player.image };
}

/** Whether two listings show the same thing, so the room writes its row only when it changes. */
export function sameListing(a: CommunityListing | null, b: CommunityListing | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Test-only stand-ins for the Arena screens (feature 023): a room view to start
// from and a room handle whose actions are spies, so screens are tested without
// a socket.
import { vi } from "vitest";
import type { PublicPlayer, PublicRoom } from "@/learning/arena/protocol";
import type { ArenaRoomHandle } from "./use-arena-room";

export const ME = "minh";
export const RIVAL = "lan";

export function player(id: string, overrides: Partial<PublicPlayer> = {}): PublicPlayer {
  return { id, name: id === ME ? "Minh Anh" : "Lan", image: null, connected: true, ready: false, score: 0, roundsWon: 0, ...overrides };
}

export function publicRoom(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return {
    code: "K7P2QX",
    settings: { mode: "mixed", level: "A1", rounds: 3, seconds: 15 },
    creatorId: ME,
    phase: "lobby",
    players: [player(ME)],
    round: 0,
    questionIndex: 0,
    questionCount: 12,
    suddenDeath: 0,
    deadline: null,
    question: null,
    questionType: null,
    lockedOut: [],
    reveal: null,
    rounds: [],
    pausedFor: null,
    winnerId: null,
    endReason: null,
    rematch: [],
    spectators: [],
    public: false,
    ...overrides,
  };
}

/** A room handle for screen tests: an open connection, the given room view, and spy actions. */
export function roomHandle(room: PublicRoom | null, overrides: Partial<ArenaRoomHandle> = {}): ArenaRoomHandle {
  return {
    status: "open",
    room,
    offset: 0,
    typing: [],
    wrong: null,
    error: null,
    ready: vi.fn(),
    start: vi.fn(),
    answer: vi.fn(),
    choose: vi.fn(),
    typingStarted: vi.fn(),
    rematch: vi.fn(),
    pickOpponent: vi.fn(),
    changeSettings: vi.fn(),
    publish: vi.fn(),
    leave: vi.fn(),
    ...overrides,
  };
}

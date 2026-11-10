// Test-only stand-ins for the team screens (feature 039): a team room view and a
// handle whose actions are spies, so screens are tested without a socket.
import { vi } from "vitest";
import type { PublicTeamRoom } from "@/learning/arena/team-protocol";
import type { TeamRoomHandle } from "./use-team-room";

export const HOST = "minh";

type TeamPlayerView = PublicTeamRoom["players"][number];

const NAMES: Record<string, string> = { minh: "Minh Anh", lan: "Lan", hoa: "Hoa", khoa: "Khoa", an: "An" };

export function teamPlayer(id: string, overrides: Partial<TeamPlayerView> = {}): TeamPlayerView {
  return { id, name: NAMES[id] ?? id, image: null, connected: true, answered: 0, correct: 0, ...overrides };
}

export function teamRoom(overrides: Partial<PublicTeamRoom> = {}): PublicTeamRoom {
  return {
    kind: "team",
    code: "K7P2QX",
    settings: { mode: "mixed", level: "A2", rounds: 1, seconds: 15, size: 6, minutes: 5 },
    hostId: HOST,
    phase: "lobby",
    players: [teamPlayer(HOST)],
    teams: { A: { members: [], score: 0, hints: 0, roundsWon: 0 }, B: { members: [], score: 0, hints: 0, roundsWon: 0 } },
    round: 0,
    roundEndsAt: null,
    roundLeftMs: null,
    stage: "main",
    suddenPair: 0,
    number: 0,
    turn: null,
    deadline: null,
    question: null,
    questionType: null,
    hint: null,
    lockedOut: false,
    reveal: null,
    rounds: [],
    pausedTeam: null,
    winner: null,
    endReason: null,
    ...overrides,
  };
}

/** A handle around `room` with every action a spy. */
export function teamHandle(room: PublicTeamRoom, overrides: Partial<Omit<TeamRoomHandle, "room">> = {}): TeamRoomHandle & { room: PublicTeamRoom } {
  return {
    status: "open",
    room,
    offset: 0,
    typing: false,
    wrong: null,
    error: null,
    assign: vi.fn(),
    order: vi.fn(),
    shuffle: vi.fn(),
    start: vi.fn(),
    answer: vi.fn(),
    choose: vi.fn(),
    hint: vi.fn(),
    typingStarted: vi.fn(),
    changeSettings: vi.fn(),
    again: vi.fn(),
    leave: vi.fn(),
    ...overrides,
  };
}

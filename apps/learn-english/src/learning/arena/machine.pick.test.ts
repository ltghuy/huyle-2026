import { describe, expect, it } from "vitest";
import { POOL } from "./fixtures";
import { COUNTDOWN_MS, createRoom, MESSAGES, READY_MS, reduce, type RoomEvent, type RoomState } from "./machine";

// The host picks who plays them next once a match ends (feature 027).

const T0 = 1_800_000_000_000;
const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: null };
const AN = { id: "an", name: "An", image: null };
const BINH = { id: "binh", name: "Binh", image: null };

function run(state: RoomState, events: RoomEvent[], at: number) {
  let result = { state, effects: [] as ReturnType<typeof reduce>["effects"] };
  for (const event of events) result = reduce(result.state, event, at);
  return result;
}

/** Minh (host) beat Lan by forfeit while An and Binh watched: the match is over. */
function ended(): RoomState {
  let state = createRoom({ code: "K7P2QX", settings: { mode: "mixed", level: "A1", rounds: 1, seconds: 15 }, creator: MINH, seed: 7, now: T0 });
  state = run(state, [{ type: "join", player: MINH }, { type: "join", player: LAN }, { type: "ready", userId: "minh" }, { type: "ready", userId: "lan" }], T0 + 1_000).state;
  state = reduce(state, { type: "tick" }, T0 + 1_000 + COUNTDOWN_MS, POOL).state;
  state = run(state, [{ type: "join", player: AN }, { type: "join", player: BINH }, { type: "rematch", userId: "lan" }, { type: "leave", userId: "lan" }], T0 + 5_000).state;
  state = { ...state, players: state.players.map((p) => ({ ...p, connected: true, goneAt: null })) };
  expect(state.phase).toBe("match-end");
  return state;
}

const AT = T0 + 60_000;

describe("the host picks the next opponent", () => {
  it("seats a spectator, moves the last opponent to watching and opens the Ready window (AC-002)", () => {
    const picked = reduce(ended(), { type: "pick", userId: "minh", opponentId: "an" }, AT);
    expect(picked.state.phase).toBe("ready");
    expect(picked.state.deadline).toBe(AT + READY_MS);
    expect(picked.state.players.map((p) => [p.id, p.connected, p.score, p.roundsWon, p.ready])).toEqual([
      ["minh", true, 0, 0, false],
      ["an", true, 0, 0, false],
    ]);
    expect(picked.state.spectators.map((s) => s.id)).toEqual(["binh", "lan"]);
    expect(picked.state.rounds).toEqual([]);
    expect(picked.state.winnerId).toBeNull();
    expect(picked.state.rematch).toEqual([]);
    expect(picked.state.questions).toEqual([]);
    expect(picked.effects).toEqual([{ type: "broadcast" }]);
  });

  it("drops a last opponent who is gone instead of making them a spectator", () => {
    const gone = reduce(ended(), { type: "disconnect", userId: "lan" }, AT - 1_000).state;
    const picked = reduce(gone, { type: "pick", userId: "minh", opponentId: "binh" }, AT).state;
    expect(picked.players.map((p) => p.id)).toEqual(["minh", "binh"]);
    expect(picked.spectators.map((s) => s.id)).toEqual(["an"]);
  });

  it("rematches the same two when the host picks the last opponent (AC-003)", () => {
    const state = ended();
    const picked = reduce(state, { type: "pick", userId: "minh", opponentId: "lan" }, AT).state;
    expect(picked.phase).toBe("ready");
    expect(picked.players.map((p) => p.id)).toEqual(["minh", "lan"]);
    expect(picked.spectators.map((s) => s.id)).toEqual(["an", "binh"]);
    expect(picked.seed).not.toBe(state.seed);
  });

  it("ignores a pick from anyone but the host, or before the match is over (AC-004)", () => {
    const state = ended();
    expect(reduce(state, { type: "pick", userId: "lan", opponentId: "an" }, AT).state).toBe(state);
    expect(reduce(state, { type: "pick", userId: "an", opponentId: "an" }, AT).state).toBe(state);
    const lobby = createRoom({ code: "K7P2QX", settings: { mode: "mixed", level: "A1", rounds: 1, seconds: 15 }, creator: MINH, seed: 7, now: T0 });
    expect(reduce(lobby, { type: "pick", userId: "minh", opponentId: "an" }, AT).state).toBe(lobby);
  });

  it("tells the host when the pick has left (AC-005), and applies only the first of two quick picks", () => {
    const state = ended();
    for (const opponentId of ["nobody", "minh"]) {
      const result = reduce(state, { type: "pick", userId: "minh", opponentId }, AT);
      expect(result.state).toBe(state);
      expect(result.effects).toEqual([{ type: "send", to: "minh", frame: { type: "error", message: MESSAGES.pickGone } }]);
    }
    const gone = reduce(state, { type: "disconnect", userId: "lan" }, AT).state;
    expect(reduce(gone, { type: "pick", userId: "minh", opponentId: "lan" }, AT).effects[0]).toMatchObject({ type: "send" });

    const first = reduce(state, { type: "pick", userId: "minh", opponentId: "an" }, AT).state;
    expect(reduce(first, { type: "pick", userId: "minh", opponentId: "binh" }, AT).state).toBe(first);
  });
});

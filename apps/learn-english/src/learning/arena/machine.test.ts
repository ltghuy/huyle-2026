import { describe, expect, it } from "vitest";
import {
  COUNTDOWN_MS,
  createRoom,
  GRACE_MS,
  IDLE_MS,
  MESSAGES,
  nextAlarm,
  READY_MS,
  reduce,
  toPublic,
  type RoomEvent,
  type RoomState,
} from "./machine";
import { CLOSE_CODES } from "./protocol";

const T0 = 1_800_000_000_000;
const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: "https://example.test/lan.png" };
const KHOA = { id: "khoa", name: "Khoa", image: null };

function room(): RoomState {
  return createRoom({ code: "K7P2QX", settings: { mode: "mixed", level: "A1", rounds: 3 }, creator: MINH, seed: 1, now: T0 });
}

/** Applies events in order, each at its own time, and returns the last result. */
function run(state: RoomState, steps: [RoomEvent, number][]) {
  let result = { state, effects: [] as ReturnType<typeof reduce>["effects"] };
  for (const [event, at] of steps) result = reduce(result.state, event, at);
  return result;
}

/** Creator connected, Lan joined at T0 + 1 s: the Ready window is open. */
function readyRoom() {
  return run(room(), [
    [{ type: "join", player: MINH }, T0 + 500],
    [{ type: "join", player: LAN }, T0 + 1_000],
  ]).state;
}

describe("joining (AC-004, AC-005)", () => {
  it("seats the creator on their first connection and shows both players once the opponent joins", () => {
    const state = readyRoom();
    expect(state.players.map((p) => [p.id, p.connected])).toEqual([["minh", true], ["lan", true]]);
    expect(toPublic(state).players[1]).toMatchObject({ name: "Lan", image: LAN.image });
  });

  it("refuses a third player, and anyone once the match has started", () => {
    const state = readyRoom();
    const third = reduce(state, { type: "join", player: KHOA }, T0 + 2_000);
    expect(third.state.players).toHaveLength(2);
    expect(third.effects).toEqual([{ type: "close", userId: "khoa", code: CLOSE_CODES.roomClosed, message: MESSAGES.full }]);
  });

  it("gives a returning player their own seat instead of a second one (own-room edge case)", () => {
    const state = reduce(readyRoom(), { type: "join", player: MINH }, T0 + 3_000).state;
    expect(state.players.filter((p) => p.id === "minh")).toHaveLength(1);
  });
});

describe("the Ready window", () => {
  it("opens for 30 s when the second player joins (AC-007)", () => {
    const state = readyRoom();
    expect(state.phase).toBe("ready");
    expect(state.deadline).toBe(T0 + 1_000 + READY_MS);
    expect(nextAlarm(state)).toBe(T0 + 1_000 + READY_MS);
  });

  it("starts the countdown when both press Sẵn sàng, and the room stops idling (AC-008)", () => {
    const one = reduce(readyRoom(), { type: "ready", userId: "minh" }, T0 + 5_000);
    expect(one.state.phase).toBe("ready");
    expect(one.state.players[0].ready).toBe(true);
    const both = reduce(one.state, { type: "ready", userId: "lan" }, T0 + 6_000);
    expect(both.state.phase).toBe("countdown");
    expect(both.state.deadline).toBe(T0 + 6_000 + COUNTDOWN_MS);
    expect(both.state.idleUntil).toBeNull();
  });

  it("lets a player take back their Sẵn sàng", () => {
    const state = run(readyRoom(), [
      [{ type: "ready", userId: "minh" }, T0 + 2_000],
      [{ type: "ready", userId: "minh" }, T0 + 3_000],
    ]).state;
    expect(state.players[0].ready).toBe(false);
  });

  it("closes without both ready, then the creator opens a new 30 s window (AC-009)", () => {
    const halfReady = reduce(readyRoom(), { type: "ready", userId: "lan" }, T0 + 2_000).state;
    const expired = reduce(halfReady, { type: "tick" }, T0 + 1_000 + READY_MS);
    expect(expired.state.phase).toBe("lobby");
    expect(expired.state.players.every((p) => !p.ready)).toBe(true);

    const notCreator = reduce(expired.state, { type: "start", userId: "lan" }, T0 + 40_000);
    expect(notCreator.state.phase).toBe("lobby");
    expect(notCreator.effects).toEqual([{ type: "send", to: "lan", frame: { type: "error", message: MESSAGES.creatorOnly } }]);

    const restarted = reduce(expired.state, { type: "start", userId: "minh" }, T0 + 40_000);
    expect(restarted.state.phase).toBe("ready");
    expect(restarted.state.deadline).toBe(T0 + 40_000 + READY_MS);
  });

  it("ignores a tick before the deadline, and a repeated tick (alarms can fire twice)", () => {
    const state = readyRoom();
    expect(reduce(state, { type: "tick" }, T0 + 10_000)).toEqual({ state, effects: [] });
    const expired = reduce(state, { type: "tick" }, T0 + 1_000 + READY_MS).state;
    expect(reduce(expired, { type: "tick" }, T0 + 1_000 + READY_MS + 5)).toEqual({ state: expired, effects: [] });
  });
});

describe("changing the settings before a match (AC-031)", () => {
  const WRITE_B1 = { mode: "write", level: "B1", rounds: 1 } as const;

  it("lets the creator change them in the lobby, and the next match uses them", () => {
    const lobby = reduce(room(), { type: "join", player: MINH }, T0 + 500).state;
    const changed = reduce(lobby, { type: "settings", userId: "minh", settings: WRITE_B1 }, T0 + 1_000);
    expect(changed.state).toMatchObject({ phase: "lobby", deadline: null, settings: WRITE_B1 });
    expect(changed.effects).toEqual([{ type: "broadcast" }]);
    expect(toPublic(changed.state).settings).toEqual(WRITE_B1);
  });

  it("clears both Ready ticks and restarts an open Ready window", () => {
    const oneReady = reduce(readyRoom(), { type: "ready", userId: "lan" }, T0 + 5_000).state;
    const changed = reduce(oneReady, { type: "settings", userId: "minh", settings: WRITE_B1 }, T0 + 20_000).state;
    expect(changed).toMatchObject({ phase: "ready", deadline: T0 + 20_000 + READY_MS, settings: WRITE_B1 });
    expect(changed.players.every((p) => !p.ready)).toBe(true);
  });

  it("ignores the same settings, so nobody loses their Ready tick", () => {
    const oneReady = reduce(readyRoom(), { type: "ready", userId: "lan" }, T0 + 5_000).state;
    expect(reduce(oneReady, { type: "settings", userId: "minh", settings: oneReady.settings }, T0 + 6_000)).toEqual({ state: oneReady, effects: [] });
  });

  it("refuses the opponent with a message", () => {
    const state = readyRoom();
    const refused = reduce(state, { type: "settings", userId: "lan", settings: WRITE_B1 }, T0 + 5_000);
    expect(refused.state).toBe(state);
    expect(refused.effects).toEqual([{ type: "send", to: "lan", frame: { type: "error", message: MESSAGES.creatorSettings } }]);
  });

  it("can't change anything once the countdown has started", () => {
    const counting = run(readyRoom(), [
      [{ type: "ready", userId: "minh" }, T0 + 5_000],
      [{ type: "ready", userId: "lan" }, T0 + 6_000],
    ]).state;
    expect(reduce(counting, { type: "settings", userId: "minh", settings: WRITE_B1 }, T0 + 7_000)).toEqual({ state: counting, effects: [] });
  });
});

describe("leaving before the match (AC-010)", () => {
  it("tells the creator when the opponent leaves and waits for a new one", () => {
    const { state, effects } = reduce(readyRoom(), { type: "leave", userId: "lan" }, T0 + 5_000);
    expect(state.phase).toBe("lobby");
    expect(state.players.map((p) => p.id)).toEqual(["minh"]);
    expect(effects).toContainEqual({ type: "broadcast" });
    const next = reduce(state, { type: "join", player: KHOA }, T0 + 6_000).state;
    expect(next.phase).toBe("ready");
  });

  it("closes the room when the creator leaves", () => {
    const { state, effects } = reduce(readyRoom(), { type: "leave", userId: "minh" }, T0 + 5_000);
    expect(state.phase).toBe("closed");
    expect(effects).toContainEqual({ type: "close", userId: null, code: CLOSE_CODES.roomClosed, message: MESSAGES.closed });
    expect(nextAlarm(state)).toBeNull();
    // A cancelled lobby is no match: nothing goes to the stats or the history (feature 025, AC-002).
    expect(effects.some((e) => e.type === "record")).toBe(false);
  });

  it("gives a dropped player 30 s to come back before they count as gone", () => {
    const dropped = reduce(readyRoom(), { type: "disconnect", userId: "lan" }, T0 + 5_000).state;
    expect(dropped.players[1]).toMatchObject({ connected: false, goneAt: T0 + 5_000 + GRACE_MS });
    // The alarm is whichever comes first: here the Ready window (T0 + 31 s) before Lan's grace (T0 + 35 s).
    expect(nextAlarm(dropped)).toBe(T0 + 1_000 + READY_MS);
    const back = reduce(dropped, { type: "join", player: LAN }, T0 + 20_000).state;
    expect(back.players.map((p) => p.id)).toEqual(["minh", "lan"]);

    const gone = reduce(dropped, { type: "tick" }, T0 + 5_000 + GRACE_MS);
    expect(gone.state.players.map((p) => p.id)).toEqual(["minh"]);
    expect(gone.state.phase).toBe("lobby");
  });

  it("closes the room when the creator drops and doesn't come back", () => {
    const dropped = reduce(readyRoom(), { type: "disconnect", userId: "minh" }, T0 + 5_000).state;
    expect(reduce(dropped, { type: "tick" }, T0 + 5_000 + GRACE_MS).state.phase).toBe("closed");
  });

  it("closes a room whose creator never connects", () => {
    expect(reduce(room(), { type: "tick" }, T0 + GRACE_MS).state.phase).toBe("closed");
  });
});

describe("idle rooms (spec edge case)", () => {
  it("close 10 minutes after creation when no match started", () => {
    const waiting = reduce(room(), { type: "join", player: MINH }, T0 + 500).state;
    expect(nextAlarm(waiting)).toBe(T0 + IDLE_MS);
    const closed = reduce(waiting, { type: "tick" }, T0 + IDLE_MS);
    expect(closed.state.phase).toBe("closed");
    expect(closed.effects).toContainEqual({ type: "close", userId: null, code: CLOSE_CODES.roomClosed, message: MESSAGES.closed });
  });
});

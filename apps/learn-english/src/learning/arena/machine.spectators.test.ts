import { describe, expect, it } from "vitest";
import { POOL, rightAnswer } from "./fixtures";
import { COUNTDOWN_MS, createRoom, currentQuestion, MESSAGES, reduce, toPublic, type RoomEvent, type RoomState } from "./machine";
import { CLOSE_CODES, MAX_SPECTATORS } from "./protocol";

// Spectators (feature 026): up to three people watch a room whose seats are taken, and nothing they send changes the match.

const T0 = 1_800_000_000_000;
const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: null };
const WATCHERS = ["an", "binh", "chi", "dung"].map((id) => ({ id, name: id.toUpperCase(), image: null }));

function run(state: RoomState, events: RoomEvent[], at = T0 + 1_000) {
  let result = { state, effects: [] as ReturnType<typeof reduce>["effects"] };
  for (const event of events) result = reduce(result.state, event, at);
  return result;
}

function lobbyWithBoth(): RoomState {
  const state = createRoom({ code: "K7P2QX", settings: { mode: "mixed", level: "A1", rounds: 1, seconds: 15 }, creator: MINH, seed: 7, now: T0 });
  return run(state, [
    { type: "join", player: MINH },
    { type: "join", player: LAN },
  ]).state;
}

/** Question 1 is open. */
function inMatch(): RoomState {
  const ready = run(lobbyWithBoth(), [
    { type: "ready", userId: "minh" },
    { type: "ready", userId: "lan" },
  ]).state;
  return reduce(ready, { type: "tick" }, T0 + 1_000 + COUNTDOWN_MS, POOL).state;
}

describe("joining as a spectator (AC-001–AC-003)", () => {
  it("seats the second person as a player when a lobby seat is free (AC-002)", () => {
    expect(lobbyWithBoth().players.map((p) => p.id)).toEqual(["minh", "lan"]);
    expect(lobbyWithBoth().spectators).toEqual([]);
  });

  it("lets up to three people watch a match in progress, and shows them to everyone", () => {
    const watched = run(inMatch(), WATCHERS.slice(0, MAX_SPECTATORS).map((player) => ({ type: "join", player }) as RoomEvent));
    expect(watched.state.phase).toBe("question");
    expect(watched.state.players).toHaveLength(2);
    expect(toPublic(watched.state).spectators).toEqual([
      { id: "an", name: "AN" },
      { id: "binh", name: "BINH" },
      { id: "chi", name: "CHI" },
    ]);
    expect(watched.effects).toEqual([{ type: "broadcast" }]);
  });

  it("refuses the sixth person as full (AC-003)", () => {
    const full = run(inMatch(), WATCHERS.slice(0, MAX_SPECTATORS).map((player) => ({ type: "join", player }) as RoomEvent)).state;
    const sixth = reduce(full, { type: "join", player: WATCHERS[3] }, T0 + 9_000);
    expect(sixth.state).toBe(full);
    expect(sixth.effects).toEqual([{ type: "close", userId: "dung", code: CLOSE_CODES.roomClosed, message: MESSAGES.full }]);
  });

  it("keeps one place for a spectator who opens a second tab", () => {
    const once = reduce(inMatch(), { type: "join", player: WATCHERS[0] }, T0 + 9_000).state;
    const twice = reduce(once, { type: "join", player: WATCHERS[0] }, T0 + 9_500);
    expect(twice.state.spectators).toHaveLength(1);
    expect(twice.effects).toContainEqual({ type: "replace", userId: "an" });
  });
});

describe("what a spectator can't do (AC-006)", () => {
  const spectating = () => reduce(lobbyWithBoth(), { type: "join", player: WATCHERS[0] }, T0 + 2_000).state;

  it("can't press Ready, start, change settings or ask for a rematch", () => {
    const state = spectating();
    for (const event of [
      { type: "ready", userId: "an" },
      { type: "start", userId: "an" },
      { type: "settings", userId: "an", settings: { mode: "listen", level: "B1", rounds: 3, seconds: 15 } },
      { type: "rematch", userId: "an" },
    ] as RoomEvent[]) {
      const result = reduce(state, event, T0 + 3_000);
      expect(result.state).toBe(state);
    }
  });

  it("can't answer or signal typing during a match", () => {
    const state = reduce(inMatch(), { type: "join", player: WATCHERS[0] }, T0 + 5_000).state;
    const question = currentQuestion(state)!;
    expect(reduce(state, { type: "answer", userId: "an", q: 0, answer: rightAnswer(question) }, T0 + 5_100).state).toBe(state);
    expect(reduce(state, { type: "typing", userId: "an", q: 0 }, T0 + 5_100).state).toBe(state);
  });

  it("leaving mid-match only takes the spectator out: no forfeit", () => {
    const state = reduce(inMatch(), { type: "join", player: WATCHERS[0] }, T0 + 5_000).state;
    const left = reduce(state, { type: "leave", userId: "an" }, T0 + 6_000);
    expect(left.state.phase).toBe("question");
    expect(left.state.winnerId).toBeNull();
    expect(left.state.spectators).toEqual([]);
    expect(left.effects).toContainEqual({ type: "close", userId: "an", code: CLOSE_CODES.roomClosed });
  });

  it("a stranger's leave changes nothing", () => {
    const state = inMatch();
    expect(reduce(state, { type: "leave", userId: "nobody" }, T0 + 6_000).state).toBe(state);
  });
});

describe("spectators coming and going (AC-008, edge cases)", () => {
  it("frees the place at once when a spectator's connection drops, without pausing the match", () => {
    const state = reduce(inMatch(), { type: "join", player: WATCHERS[0] }, T0 + 5_000).state;
    const dropped = reduce(state, { type: "disconnect", userId: "an" }, T0 + 6_000);
    expect(dropped.state.phase).toBe("question");
    expect(dropped.state.spectators).toEqual([]);
    expect(dropped.effects).toEqual([{ type: "broadcast" }]);
  });

  it("keeps spectators when a player leaves the lobby, and gives the free seat to the next to join", () => {
    const watched = reduce(lobbyWithBoth(), { type: "join", player: WATCHERS[0] }, T0 + 2_000).state;
    const left = reduce(watched, { type: "leave", userId: "lan" }, T0 + 3_000).state;
    expect(left.spectators.map((s) => s.id)).toEqual(["an"]);
    const next = reduce(left, { type: "join", player: WATCHERS[1] }, T0 + 4_000).state;
    expect(next.players.map((p) => p.id)).toEqual(["minh", "binh"]);
  });

  it("closes the room for spectators too when the creator leaves", () => {
    const watched = reduce(lobbyWithBoth(), { type: "join", player: WATCHERS[0] }, T0 + 2_000).state;
    const closed = reduce(watched, { type: "leave", userId: "minh" }, T0 + 3_000);
    expect(closed.state.phase).toBe("closed");
    expect(closed.effects).toContainEqual({ type: "close", userId: null, code: CLOSE_CODES.roomClosed, message: MESSAGES.closed });
  });
});

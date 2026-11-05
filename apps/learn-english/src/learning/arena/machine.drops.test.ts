import { describe, expect, it } from "vitest";
import { POOL, rightAnswer } from "./fixtures";
import {
  COUNTDOWN_MS,
  createRoom,
  currentQuestion,
  GRACE_MS,
  IDLE_MS,
  READY_MS,
  reduce,
  REVEAL_MS,
  toPublic,
  type RoomState,
} from "./machine";
import { QUESTION_SECONDS } from "./questions";

const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: null };
const T0 = 1_800_000_000_000;

function countdown(): RoomState {
  let state = createRoom({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1 }, creator: MINH, seed: 7, now: T0 });
  state = reduce(state, { type: "join", player: MINH }, T0).state;
  state = reduce(state, { type: "join", player: LAN }, T0).state;
  state = reduce(state, { type: "ready", userId: "minh" }, T0).state;
  return reduce(state, { type: "ready", userId: "lan" }, T0).state;
}

/** Question 1 open at T0 + 3 s. */
function inQuestion(): RoomState {
  return reduce(countdown(), { type: "tick" }, T0 + COUNTDOWN_MS, POOL).state;
}

/** A 1-round match Minh won 1-0 (Lan let every other question time out). */
function finished(): RoomState {
  let state = inQuestion();
  let at = T0 + COUNTDOWN_MS;
  state = reduce(state, { type: "answer", userId: "minh", q: 0, answer: rightAnswer(currentQuestion(state)!) }, (at += 1_000)).state;
  while (state.phase !== "match-end") {
    at = Math.max(at, state.deadline!);
    state = reduce(state, { type: "tick" }, at).state;
  }
  return state;
}

describe("a drop during the match (AC-024, AC-025, AC-026)", () => {
  it("pauses the match and shows who it waits for, with a 30 s countdown", () => {
    const paused = reduce(inQuestion(), { type: "disconnect", userId: "lan" }, T0 + 5_000).state;
    expect(paused).toMatchObject({ phase: "paused", pausedFor: "lan", pausedFrom: "question", deadline: T0 + 5_000 + GRACE_MS });
    expect(toPublic(paused)).toMatchObject({ phase: "paused", pausedFor: "lan", question: null });
  });

  it("ignores answers while paused", () => {
    const paused = reduce(inQuestion(), { type: "disconnect", userId: "lan" }, T0 + 5_000).state;
    const tried = reduce(paused, { type: "answer", userId: "minh", q: 0, answer: rightAnswer(currentQuestion(paused)!) }, T0 + 6_000);
    expect(tried.state).toBe(paused);
  });

  it("restarts the interrupted question with its full time when the player is back in 30 s", () => {
    const paused = reduce(inQuestion(), { type: "disconnect", userId: "lan" }, T0 + 5_000).state;
    const back = reduce(paused, { type: "join", player: LAN }, T0 + 20_000).state;
    expect(back).toMatchObject({ phase: "question", questionIndex: 0, pausedFor: null, answeredBy: null, lockedOut: [] });
    expect(back.deadline).toBe(T0 + 20_000 + QUESTION_SECONDS.recall * 1_000);
    expect(back.players.every((p) => p.connected)).toBe(true);
  });

  it("carries on a reveal after a drop during it", () => {
    let state = inQuestion();
    state = reduce(state, { type: "answer", userId: "minh", q: 0, answer: rightAnswer(currentQuestion(state)!) }, T0 + 4_000).state;
    state = reduce(state, { type: "disconnect", userId: "minh" }, T0 + 4_500).state;
    const back = reduce(state, { type: "join", player: MINH }, T0 + 9_000).state;
    expect(back).toMatchObject({ phase: "reveal", deadline: T0 + 9_000 + REVEAL_MS, answeredBy: "minh" });
  });

  it("gives the match to the player who stayed when the other isn't back in 30 s, and records it", () => {
    const paused = reduce(inQuestion(), { type: "disconnect", userId: "lan" }, T0 + 5_000).state;
    const over = reduce(paused, { type: "tick" }, T0 + 5_000 + GRACE_MS);
    expect(over.state).toMatchObject({ phase: "match-end", winnerId: "minh", endReason: "forfeit", pausedFor: null });
    expect(over.effects).toContainEqual(expect.objectContaining({ type: "record", winnerId: "minh", loserId: "lan" }));
  });

  it("treats leaving mid-match as a forfeit", () => {
    const over = reduce(inQuestion(), { type: "leave", userId: "minh" }, T0 + 5_000);
    expect(over.state).toMatchObject({ phase: "match-end", winnerId: "lan", endReason: "forfeit" });
    expect(over.effects).toContainEqual(expect.objectContaining({ type: "record", winnerId: "lan", loserId: "minh" }));
  });

  it("pauses during the countdown too, and runs it again on return", () => {
    const paused = reduce(countdown(), { type: "disconnect", userId: "minh" }, T0 + 1_000).state;
    expect(paused.pausedFrom).toBe("countdown");
    const back = reduce(paused, { type: "join", player: MINH }, T0 + 4_000).state;
    expect(back).toMatchObject({ phase: "countdown", deadline: T0 + 4_000 + COUNTDOWN_MS });
  });
});

describe("a second tab (spec edge case)", () => {
  it("keeps one seat and asks the room to close the older socket", () => {
    const state = inQuestion();
    const again = reduce(state, { type: "join", player: LAN }, T0 + 5_000);
    expect(again.state.players).toHaveLength(2);
    expect(again.effects).toContainEqual({ type: "replace", userId: "lan" });
    expect(again.state.phase).toBe("question");
  });
});

describe("rematch (AC-027)", () => {
  it("waits for both, then keeps the settings, draws new questions and opens a new Ready window", () => {
    const ended = finished();
    expect(ended.winnerId).toBe("minh");
    const one = reduce(ended, { type: "rematch", userId: "lan" }, T0 + 200_000);
    expect(one.state.phase).toBe("match-end");
    expect(toPublic(one.state).rematch).toEqual(["lan"]);

    const both = reduce(one.state, { type: "rematch", userId: "minh" }, T0 + 201_000).state;
    expect(both).toMatchObject({ phase: "ready", deadline: T0 + 201_000 + READY_MS, round: 0, rounds: [], winnerId: null, endReason: null, questions: [] });
    expect(both.settings).toEqual(ended.settings);
    expect(both.seed).not.toBe(ended.seed);
    expect(both.players.every((p) => p.roundsWon === 0 && p.score === 0 && !p.ready)).toBe(true);
  });

  it("isn't possible once the other player has gone", () => {
    const ended = reduce(finished(), { type: "disconnect", userId: "lan" }, T0 + 200_000).state;
    const asked = reduce(reduce(ended, { type: "rematch", userId: "minh" }, T0 + 201_000).state, { type: "rematch", userId: "lan" }, T0 + 202_000).state;
    expect(asked.phase).toBe("match-end");
  });

  it("closes a finished room after a while if nobody plays again", () => {
    const ended = finished();
    expect(ended.idleUntil).not.toBeNull();
    expect(reduce(ended, { type: "tick" }, ended.idleUntil! + IDLE_MS).state.phase).toBe("closed");
  });
});

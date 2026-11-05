import { describe, expect, it } from "vitest";
import { AUDIO, POOL, rightAnswer, wrongAnswer } from "./fixtures";
import {
  COUNTDOWN_MS,
  createRoom,
  currentQuestion,
  MAX_ANSWERS_PER_SECOND,
  MESSAGES,
  needsPool,
  nextAlarm,
  reduce,
  REVEAL_MS,
  ROUND_RESULT_MS,
  toPublic,
  type Effect,
  type RoomState,
} from "./machine";
import type { ArenaMode } from "./protocol";
import { QUESTION_SECONDS, ROUND_SIZE, type ArenaPool } from "./questions";

const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: null };

/** A clock the tests move forward. */
let now = 1_800_000_000_000;

/** Both players in, both ready, the countdown over: question 1 of round 1 is open. */
function startMatch(mode: ArenaMode = "mixed", rounds: 1 | 3 = 1, pool: ArenaPool = POOL): RoomState {
  now = 1_800_000_000_000;
  let state = createRoom({ code: "K7P2QX", settings: { mode, level: "A1", rounds }, creator: MINH, seed: 7, now });
  state = reduce(state, { type: "join", player: MINH }, (now += 100)).state;
  state = reduce(state, { type: "join", player: LAN }, (now += 100)).state;
  state = reduce(state, { type: "ready", userId: "minh" }, (now += 100)).state;
  state = reduce(state, { type: "ready", userId: "lan" }, (now += 100)).state;
  expect(needsPool(state)).toBe(true);
  return reduce(state, { type: "tick" }, (now += COUNTDOWN_MS), pool).state;
}

function answer(state: RoomState, userId: string, right: boolean, after = 1_000) {
  const question = currentQuestion(state)!;
  return reduce(state, { type: "answer", userId, q: state.questionIndex, answer: right ? rightAnswer(question) : wrongAnswer(question) }, (now += after));
}

/** Ticks past the current deadline. */
function tick(state: RoomState) {
  now = Math.max(now, state.deadline!);
  return reduce(state, { type: "tick" }, now);
}

/**
 * Plays the round's 12 questions and moves past the last reveal, returning what follows (sudden
 * death, the round result or the match end). `winnerOf(i)` scores question i, or nobody when null.
 */
function play(state: RoomState, winnerOf: (index: number) => string | null): { state: RoomState; effects: Effect[] } {
  let result = { state, effects: [] as Effect[] };
  for (let index = 0; index < ROUND_SIZE; index++) {
    expect(result.state).toMatchObject({ phase: "question", questionIndex: index });
    const winner = winnerOf(index);
    result = winner ? answer(result.state, winner, true) : tick(result.state);
    result = tick(result.state);
  }
  return result;
}

describe("starting the match", () => {
  it("builds every round's questions once and opens question 1 with its type's time (AC-011, AC-012)", () => {
    const state = startMatch("mixed", 3);
    expect(state.phase).toBe("question");
    expect(state.round).toBe(1);
    expect(state.questions).toHaveLength(3);
    expect(state.questions.every((r) => r.main.length === ROUND_SIZE && r.suddenDeath.length === 3)).toBe(true);
    expect(state.deadline).toBe(now + QUESTION_SECONDS[currentQuestion(state)!.type] * 1_000);
    expect(needsPool(state)).toBe(false);
  });

  it("never asks an item twice in a match while the level has enough", () => {
    const ids = startMatch("listen", 1).questions.flatMap((r) => [...r.main, ...r.suddenDeath].map((q) => q.itemId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the 30 s of Viết câu and the 15 s of the others", () => {
    const write = startMatch("write");
    expect(write.deadline! - now).toBe(30_000);
    const listen = startMatch("listen");
    expect(listen.deadline! - now).toBe(15_000);
  });

  it("closes the room when the level can't fill the match", () => {
    let state = createRoom({ code: "K7P2QX", settings: { mode: "write", level: "A1", rounds: 1 }, creator: MINH, seed: 7, now });
    state = reduce(state, { type: "join", player: MINH }, now).state;
    state = reduce(state, { type: "join", player: LAN }, now).state;
    state = reduce(state, { type: "ready", userId: "minh" }, now).state;
    state = reduce(state, { type: "ready", userId: "lan" }, now).state;
    const short = reduce(state, { type: "tick" }, now + COUNTDOWN_MS, { ...POOL, sentences: POOL.sentences.slice(0, 4) });
    expect(short.state.phase).toBe("closed");
    expect(short.effects).toContainEqual(expect.objectContaining({ type: "close", message: MESSAGES.noQuestions }));
  });
});

describe("answering", () => {
  it("shows both players the question without its answer (AC-019)", () => {
    const view = toPublic(startMatch("recall"));
    expect(view.question).toMatchObject({ type: "recall", mask: expect.any(String) });
    expect(JSON.stringify(view)).not.toContain(AUDIO);
    expect(view.reveal).toBeNull();
  });

  it("relays typing once per question, to the opponent only (AC-013)", () => {
    const state = startMatch("write");
    const first = reduce(state, { type: "typing", userId: "minh", q: 0 }, now);
    expect(first.effects).toEqual([{ type: "send-others", except: "minh", frame: { type: "typing", userId: "minh" } }]);
    expect(reduce(first.state, { type: "typing", userId: "minh", q: 0 }, now).effects).toEqual([]);
  });

  it("tells everyone a typed answer was wrong, never what it was, and lets the player try again (AC-013, AC-014)", () => {
    const wrong = answer(startMatch("recall"), "lan", false);
    expect(wrong.effects).toEqual([{ type: "send-all", frame: { type: "wrong", userId: "lan" } }]);
    expect(wrong.state.phase).toBe("question");
    const right = answer(wrong.state, "lan", true);
    expect(right.state.answeredBy).toBe("lan");
  });

  it("locks a player out of a listening question after a wrong pick (AC-014)", () => {
    const wrong = answer(startMatch("listen"), "minh", false);
    expect(wrong.state.lockedOut).toEqual(["minh"]);
    expect(toPublic(wrong.state).lockedOut).toEqual(["minh"]);
    expect(answer(wrong.state, "minh", true).state.answeredBy).toBeNull();
    expect(answer(wrong.state, "lan", true).state.answeredBy).toBe("lan");
  });

  it("ends a listening question at once when both picked wrong, with no point", () => {
    const state = answer(answer(startMatch("listen"), "minh", false).state, "lan", false).state;
    expect(state.phase).toBe("reveal");
    expect(state.answeredBy).toBeNull();
    expect(state.players.map((p) => p.score)).toEqual([0, 0]);
  });

  it("gives the point to the first correct answer the room handles and closes the question for both (AC-016)", () => {
    const first = answer(startMatch("mixed"), "lan", true);
    expect(first.state.phase).toBe("reveal");
    expect(first.state.players.find((p) => p.id === "lan")!.score).toBe(1);
    // Minh's right answer a moment later finds the question closed (near-simultaneous edge case).
    const second = answer(first.state, "minh", true, 5);
    expect(second.state).toBe(first.state);
  });

  it("ignores an answer after the deadline even if the alarm is late, and an answer to another question", () => {
    const state = startMatch("recall");
    const late = reduce(state, { type: "answer", userId: "minh", q: 0, answer: rightAnswer(currentQuestion(state)!) }, state.deadline!);
    expect(late.state).toBe(state);
    const stale = reduce(state, { type: "answer", userId: "minh", q: 3, answer: rightAnswer(currentQuestion(state)!) }, now + 10);
    expect(stale.state).toBe(state);
  });

  it("drops answers past the flood limit (spec edge case)", () => {
    let state = startMatch("recall");
    for (let i = 0; i < MAX_ANSWERS_PER_SECOND; i++) state = answer(state, "minh", false, 10).state;
    const flooded = answer(state, "minh", true, 10);
    expect(flooded.state.answeredBy).toBeNull();
    const later = answer(flooded.state, "minh", true, 1_000);
    expect(later.state.answeredBy).toBe("minh");
  });

  it("gives no point when time runs out (AC-017) and reveals the answer to both (AC-018)", () => {
    const timedOut = tick(startMatch("write"));
    expect(timedOut.state.phase).toBe("reveal");
    expect(timedOut.state.deadline).toBe(now + REVEAL_MS);
    const view = toPublic(timedOut.state);
    expect(view.reveal).toMatchObject({ answer: expect.any(String), answeredBy: null });
    expect(timedOut.state.players.every((p) => p.score === 0)).toBe(true);
  });

  it("moves to the next question after the reveal", () => {
    const next = tick(tick(startMatch("mixed")).state).state;
    expect(next.phase).toBe("question");
    expect(next.questionIndex).toBe(1);
    expect(next.answeredBy).toBeNull();
  });
});

describe("rounds and the match", () => {
  it("ends a 1-round match after 12 questions with the higher score winning, and records it (AC-020, AC-022, AC-029)", () => {
    const end = play(startMatch("mixed", 1), (i) => (i % 3 === 0 ? "lan" : "minh"));
    expect(end.state.phase).toBe("match-end");
    expect(end.state.winnerId).toBe("minh");
    expect(end.state.endReason).toBe("won");
    expect(end.state.rounds).toEqual([{ round: 1, scores: { minh: 8, lan: 4 }, winnerId: "minh" }]);
    expect(end.effects).toContainEqual(expect.objectContaining({ type: "record", winnerId: "minh", loserId: "lan" }));
    expect(nextAlarm(end.state)).not.toBeNull();
  });

  it("puts the whole match on the record for the history (feature 025, AC-001)", () => {
    const one = play(startMatch("recall", 3), () => "lan");
    const two = play(tick(one.state).state, (i) => (i < 8 ? "lan" : "minh"));
    const record = two.effects.find((e) => e.type === "record");
    expect(record).toEqual({
      type: "record",
      winnerId: "lan",
      loserId: "minh",
      match: {
        endedAt: now,
        reason: "won",
        settings: { mode: "recall", level: "A1", rounds: 3 },
        winnerId: "lan",
        players: [
          { ...MINH, roundsWon: 0 },
          { ...LAN, roundsWon: 2 },
        ],
        rounds: [
          { round: 1, scores: { minh: 0, lan: 12 }, winnerId: "lan" },
          { round: 2, scores: { minh: 4, lan: 8 }, winnerId: "lan" },
        ],
      },
    });
  });

  it("shows the round result, then starts round 2 with fresh scores", () => {
    const roundOne = play(startMatch("mixed", 3), () => "minh");
    expect(roundOne.state.phase).toBe("round-end");
    expect(roundOne.state.deadline).toBe(now + ROUND_RESULT_MS);
    expect(roundOne.state.players.find((p) => p.id === "minh")!.roundsWon).toBe(1);
    expect(roundOne.effects.some((e) => e.type === "record")).toBe(false);
    const roundTwo = tick(roundOne.state).state;
    expect(roundTwo).toMatchObject({ phase: "question", round: 2, questionIndex: 0 });
    expect(roundTwo.players.every((p) => p.score === 0)).toBe(true);
  });

  it("ends best of 3 at 2-0 without a third round (AC-022)", () => {
    const one = play(startMatch("mixed", 3), () => "lan");
    const two = play(tick(one.state).state, () => "lan");
    expect(two.state.phase).toBe("match-end");
    expect(two.state.winnerId).toBe("lan");
    expect(two.state.rounds).toHaveLength(2);
  });

  it("plays a third round at 1-1", () => {
    const one = play(startMatch("mixed", 3), () => "lan");
    const two = play(tick(one.state).state, () => "minh");
    expect(two.state.phase).toBe("round-end");
    const three = play(tick(two.state).state, () => "minh");
    expect(three.state).toMatchObject({ phase: "match-end", winnerId: "minh" });
  });
});

describe("sudden death (AC-021)", () => {
  /** 6-6 after 12 questions. */
  const tied = () => play(startMatch("mixed", 1), (i) => (i % 2 === 0 ? "minh" : "lan"));

  it("asks a sudden-death question after a tied round, and its first correct answer takes the round", () => {
    const sudden = tied().state;
    expect(sudden).toMatchObject({ phase: "question", questionIndex: ROUND_SIZE, suddenDeath: 1 });
    expect(toPublic(sudden).suddenDeath).toBe(1);
    const won = tick(answer(sudden, "lan", true).state);
    expect(won.state).toMatchObject({ phase: "match-end", winnerId: "lan" });
    expect(won.state.rounds[0].scores).toEqual({ minh: 6, lan: 7 });
    expect(won.state.rounds[0].suddenDeath).toBe(true);
  });

  it("asks up to 3, then gives the round to the player who was faster on the questions they won", () => {
    // Minh answered every won question in 1 s, Lan in 2 s.
    let state = startMatch("mixed", 1);
    for (let i = 0; i < ROUND_SIZE; i++) {
      state = answer(state, i % 2 === 0 ? "minh" : "lan", true, i % 2 === 0 ? 1_000 : 2_000).state;
      state = tick(state).state;
    }
    expect(state.suddenDeath).toBe(1);
    state = tick(tick(state).state).state; // sudden death 1: nobody
    expect(state.suddenDeath).toBe(2);
    state = tick(tick(state).state).state; // 2: nobody
    expect(state.suddenDeath).toBe(3);
    const end = tick(tick(state).state); // 3: nobody, then the tie-break
    expect(end.state).toMatchObject({ phase: "match-end", winnerId: "minh" });
  });
});

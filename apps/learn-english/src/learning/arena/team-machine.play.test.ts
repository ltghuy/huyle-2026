import { describe, expect, it } from "vitest";
import { sentence, word } from "../exercises/fixtures";
import { errorTo, TeamDriver } from "./team-fixtures";
import { deckSize, nextTeamAlarm, TEAM_MESSAGES, TEAM_REVEAL_MS, TEAM_ROUND_RESULT_MS, toPublicTeam } from "./team-machine";

/** Host + 4: A = minh, lan, hoa; B = khoa, an (3 vs 2). */
function threeVsTwo(settings = {}) {
  return new TeamDriver(settings).fill(4).teams(["minh", "lan", "hoa"], ["khoa", "an"]).begin();
}

describe("turns (AC-017 to AC-021)", () => {
  it("opens the round with the clock, team A and its first member", () => {
    const room = threeVsTwo();
    expect(room.state).toMatchObject({ phase: "question", round: 1, number: 1, turnTeam: "A", turnPlayer: "minh", hints: { A: 1, B: 1 } });
    expect(room.state.roundEndsAt).toBe(room.now + 5 * 60_000);
    expect(room.state.deadline).toBe(room.now + 15_000);
  });

  it("alternates teams and rotates members, wrapping each team on its own", () => {
    const room = threeVsTwo();
    const order: string[] = [];
    for (let i = 0; i < 8; i++) {
      order.push(room.state.turnPlayer!);
      room.turn(true);
    }
    expect(order).toEqual(["minh", "khoa", "lan", "an", "hoa", "khoa", "minh", "an"]);
  });

  it("builds decks sized to the round", () => {
    const room = threeVsTwo({ minutes: 10, rounds: 3 });
    expect(room.decks.map((d) => d.length)).toEqual([deckSize({ minutes: 10 }), deckSize({ minutes: 10 }), deckSize({ minutes: 10 })]);
    expect(deckSize({ minutes: 5 })).toBe(83);
  });

  it("closes the room when the level can't fill the mode", () => {
    const room = new TeamDriver({ mode: "listen" }, { words: [], sentences: [sentence("s0", { tokens: ["We", "go"] })], wordings: new Map() }).fill(1).teams(["minh"], ["lan"]);
    room.send({ type: "start", userId: "minh" });
    room.tick();
    expect(room.state.phase).toBe("closed");
    expect(room.effects).toContainEqual(expect.objectContaining({ type: "close", message: TEAM_MESSAGES.noQuestions }));
  });

  it("lets only the turn player answer", () => {
    const room = threeVsTwo();
    const before = room.state;
    room.answer(true, 500, "lan");
    room.answer(true, 500, "khoa");
    expect(room.state).toBe(before);
  });

  it("relays typing from the turn player only", () => {
    const room = threeVsTwo();
    room.send({ type: "typing", userId: "minh", q: 1 });
    expect(room.effects).toEqual([{ type: "send-others", except: "minh", frame: { type: "typing", userId: "minh" } }]);
    room.send({ type: "typing", userId: "lan", q: 1 });
    expect(room.effects).toEqual([]);
  });
});

describe("answers (AC-022 to AC-026)", () => {
  it("scores a correct answer and reveals it for 2 s", () => {
    const room = threeVsTwo();
    room.answer(true);
    expect(room.state).toMatchObject({ phase: "reveal", scores: { A: 1, B: 0 }, lastCorrect: true });
    expect(room.state.deadline).toBe(room.now + TEAM_REVEAL_MS);
    const view = toPublicTeam(room.state, room.decks[0]);
    expect(view.reveal).toMatchObject({ correct: true, by: "minh", answeredBy: "minh" });
  });

  it("lets a typed answer try again, ends a listening question on a wrong pick", () => {
    const room = new TeamDriver({ mode: "recall" }).fill(1).teams(["minh"], ["lan"]).begin();
    const typed = room.answer(false);
    expect(typed.effects).toEqual([{ type: "send-all", frame: { type: "wrong", userId: "minh" } }]);
    expect(room.state.phase).toBe("question");
    room.answer(true);
    expect(room.state.scores.A).toBe(1);

    const listen = new TeamDriver({ mode: "listen" }).fill(1).teams(["minh"], ["lan"]).begin();
    listen.answer(false);
    expect(listen.state).toMatchObject({ phase: "reveal", lastCorrect: false, scores: { A: 0, B: 0 } });
  });

  it("gives nobody a point when time runs out, and the other team no chance at it", () => {
    const room = threeVsTwo();
    room.tick();
    expect(room.state).toMatchObject({ phase: "reveal", scores: { A: 0, B: 0 } });
    room.tick();
    expect(room.state).toMatchObject({ phase: "question", turnTeam: "B", number: 2, deckIndex: 1 });
  });

  it("ignores late and stale answers", () => {
    const room = threeVsTwo();
    const question = room.question;
    room.now = room.state.deadline!;
    const before = room.state;
    room.send({ type: "answer", userId: "minh", q: 1, answer: { text: "x" } }, 0);
    expect(room.state).toBe(before);
    room.now -= 5_000;
    room.send({ type: "answer", userId: "minh", q: 7, answer: { text: "x" } }, 0);
    expect(room.state).toBe(before);
    expect(question).toBeDefined();
  });

  it("never shows the answer while the question is open", () => {
    const room = threeVsTwo({ mode: "recall" });
    const view = toPublicTeam(room.state, room.decks[0]);
    expect(view.reveal).toBeNull();
    expect(JSON.stringify(view)).not.toContain(`"${room.question.type === "recall" ? room.question.instance.headword : ""}"`);
  });
});

describe("the end of the clock (AC-027, AC-029)", () => {
  it("closes the open question at zero with no point, and opens no other one", () => {
    const room = threeVsTwo();
    room.turn(true); // A scores; B's question is open
    room.timeUp();
    room.answer(true, 0, "khoa"); // right, but the clock is at zero
    expect(room.state.phase).toBe("question");
    room.send({ type: "tick" }, 0);
    expect(room.state).toMatchObject({ phase: "reveal", lastCorrect: false, scores: { A: 1, B: 0 } });
    room.tick();
    expect(room.state).toMatchObject({ phase: "match-end", winner: "A", rounds: [{ scores: { A: 1, B: 0 }, suddenDeath: false }] });
  });

  it("wakes the room when the round clock reaches zero before the question's own time", () => {
    const room = threeVsTwo();
    room.state = { ...room.state, roundEndsAt: room.now + 3_000 };
    expect(nextTeamAlarm(room.state)).toBe(room.now + 3_000);
  });

  it("opens no question after a reveal that ends past zero, whoever answered last", () => {
    const room = threeVsTwo();
    room.answer(true); // A, reveal
    room.timeUp().tick();
    expect(room.state).toMatchObject({ phase: "match-end", winner: "A" });
  });

  it("goes to sudden death when the clock stops on a tie", () => {
    const room = threeVsTwo();
    room.turn(true).turn(true); // 1-1, A's question open
    room.timeUp().tick(); // closed at zero
    room.tick();
    expect(room.state).toMatchObject({ phase: "question", stage: "sudden", suddenPair: 1, turnTeam: "B" });
  });

  it("gives the round to the team with more points", () => {
    const room = new TeamDriver({ rounds: 3 }).fill(1).teams(["minh"], ["lan"]).begin();
    room.turn(true);
    room.timeUp().turn(false); // B's question closes at zero
    expect(room.state.phase).toBe("round-end");
    expect(room.state.rounds).toEqual([{ round: 1, scores: { A: 1, B: 0 }, winner: "A", suddenDeath: false }]);
    expect(room.state.roundsWon).toEqual({ A: 1, B: 0 });
    expect(room.state.deadline).toBe(room.now + TEAM_ROUND_RESULT_MS);
  });

  it("lets team B open round 2, with fresh points, hints and clock", () => {
    const room = new TeamDriver({ rounds: 3 }).fill(1).teams(["minh"], ["lan"]).begin();
    room.turn(true);
    room.timeUp().turn(false);
    room.tick();
    expect(room.state).toMatchObject({ phase: "question", round: 2, turnTeam: "B", scores: { A: 0, B: 0 }, hints: { A: 1, B: 1 }, deckIndex: 0 });
    expect(room.state.roundEndsAt).toBe(room.now + 5 * 60_000);
    expect(room.question.itemId).toBe(room.decks[1][0].itemId);
  });
});

describe("hints (AC-030 to AC-036)", () => {
  function recallRoom() {
    return new TeamDriver({ mode: "recall" }).fill(3).teams(["minh", "lan"], ["hoa", "khoa"]).begin();
  }

  it("spends a team hint and shows the first letter to everyone", () => {
    const room = recallRoom();
    room.send({ type: "hint", userId: "minh", q: 1 });
    expect(room.state).toMatchObject({ hinted: true, hints: { A: 0, B: 1 } });
    const view = toPublicTeam(room.state, room.decks[0]);
    const headword = room.question.type === "recall" ? room.question.instance.headword : "";
    expect(view.hint).toBe(headword[0] + "*".repeat(headword.length - 1));
  });

  it("earns a hint for every correct answer, hinted or not, worth a full point", () => {
    const room = recallRoom();
    room.send({ type: "hint", userId: "minh", q: 1 });
    room.answer(true);
    expect(room.state).toMatchObject({ scores: { A: 1 }, hints: { A: 1, B: 1 } });
    room.tick();
    room.turn(true); // B
    expect(room.state.hints).toEqual({ A: 1, B: 2 });
  });

  it("refuses a hint out of turn, twice, without hints, or on a listening question", () => {
    const room = recallRoom();
    room.send({ type: "hint", userId: "lan", q: 1 });
    expect(errorTo(room.effects, "lan")).toBe(TEAM_MESSAGES.notYourTurn);
    room.send({ type: "hint", userId: "minh", q: 1 });
    room.send({ type: "hint", userId: "minh", q: 1 });
    expect(errorTo(room.effects, "minh")).toBe(TEAM_MESSAGES.hinted);
    room.turn(false).turn(false); // A wrong, B wrong
    room.send({ type: "hint", userId: "lan", q: 3 });
    expect(errorTo(room.effects, "lan")).toBe(TEAM_MESSAGES.noHints);

    const listen = new TeamDriver({ mode: "listen" }).fill(1).teams(["minh"], ["lan"]).begin();
    listen.send({ type: "hint", userId: "minh", q: 1 });
    expect(errorTo(listen.effects, "minh")).toBe(TEAM_MESSAGES.listenHint);
    expect(listen.state.hints.A).toBe(1);
  });

  it("hints a sentence word by word", () => {
    const pool = { words: [word("apple")], sentences: [sentence("s0", { tokens: ["I", "am", "happy"] })], wordings: new Map() };
    const room = new TeamDriver({ mode: "write" }, pool).fill(1).teams(["minh"], ["lan"]).begin();
    room.send({ type: "hint", userId: "minh", q: 1 });
    expect(toPublicTeam(room.state, room.decks[0]).hint).toBe("I a* h****");
  });
});

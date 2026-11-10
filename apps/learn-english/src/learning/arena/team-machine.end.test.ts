import { describe, expect, it } from "vitest";
import { CLOSE_CODES } from "./protocol";
import { errorTo, HOST, TeamDriver } from "./team-fixtures";
import { TEAM_MESSAGES, toPublicTeam, type FinishedTeamMatch } from "./team-machine";

function oneVsOne(settings = {}) {
  return new TeamDriver(settings).fill(1).teams(["minh"], ["lan"]).begin();
}

/** Ends the round level at `points` each: both teams right `points` times, then the clock is up after B. */
function levelRound(room: TeamDriver, points = 1) {
  for (let i = 0; i < points - 1; i++) room.turn(true).turn(true);
  room.turn(true);
  room.timeUp().turn(true);
  return room;
}

const recorded = (room: TeamDriver): FinishedTeamMatch | undefined => {
  const effect = room.effects.find((e) => e.type === "record-team");
  return effect?.type === "record-team" ? effect.match : undefined;
};

describe("sudden death (AC-037)", () => {
  it("plays a pair when the round ends level, the team that didn't answer last first", () => {
    const room = levelRound(oneVsOne());
    expect(room.state).toMatchObject({ phase: "question", stage: "sudden", suddenPair: 1, turnTeam: "A" });
  });

  it("gives the round to the only team right in a pair", () => {
    const room = levelRound(oneVsOne());
    room.turn(false).turn(true);
    expect(room.state).toMatchObject({ phase: "match-end", winner: "B" });
    expect(room.state.rounds[0]).toEqual({ round: 1, scores: { A: 1, B: 2 }, winner: "B", suddenDeath: true });
  });

  it("plays up to three pairs, then calls the round a draw (AC-039)", () => {
    const room = levelRound(oneVsOne());
    room.turn(true).turn(true);
    expect(room.state.suddenPair).toBe(2);
    room.turn(false).turn(false);
    room.turn(null).turn(null);
    expect(room.state).toMatchObject({ phase: "match-end", winner: "draw" });
    expect(room.state.rounds[0].winner).toBeNull();
  });
});

describe("the match result (AC-038 to AC-041)", () => {
  it("ends best of 3 at 2-0 without a third round", () => {
    const room = oneVsOne({ rounds: 3 });
    room.turn(true).timeUp().turn(false);
    expect(room.state.phase).toBe("round-end");
    room.tick(); // round 2: B opens
    room.turn(false).timeUp().turn(true);
    expect(room.state).toMatchObject({ phase: "match-end", winner: "A", roundsWon: { A: 2, B: 0 } });
    expect(room.state.rounds).toHaveLength(2);
  });

  it("counts a drawn round for nobody and can end the match drawn", () => {
    const room = oneVsOne({ rounds: 3 });
    room.turn(true).timeUp().turn(false); // A wins round 1
    room.tick();
    room.turn(true).timeUp().turn(false); // B wins round 2 (B opened)
    room.tick();
    levelRound(room);
    room.turn(null).turn(null).turn(null).turn(null).turn(null).turn(null);
    expect(room.state).toMatchObject({ phase: "match-end", winner: "draw", roundsWon: { A: 1, B: 1 } });
  });

  it("records the teams for history, never the Arena record (AC-040)", () => {
    const room = new TeamDriver().fill(2).teams(["minh", "hoa"], ["lan"]).begin();
    room.turn(true).timeUp().turn(false);
    expect(recorded(room)).toMatchObject({
      reason: "won",
      winner: "A",
      teams: { A: [{ id: "minh" }, { id: "hoa" }], B: [{ id: "lan" }] },
      roundsWon: { A: 1, B: 0 },
    });
    expect(room.effects.some((e) => (e as { type: string }).type === "record")).toBe(false);
  });

  it("counts each player's turns and right answers (AC-041)", () => {
    const room = new TeamDriver().fill(2).teams(["minh", "hoa"], ["lan"]).begin();
    room.turn(true).turn(false).turn(false);
    room.timeUp().turn(true);
    const players = toPublicTeam(room.state).players;
    expect(players.find((p) => p.id === "minh")).toMatchObject({ answered: 1, correct: 1 });
    expect(players.find((p) => p.id === "lan")).toMatchObject({ answered: 2, correct: 1 });
    expect(players.find((p) => p.id === "hoa")).toMatchObject({ answered: 1, correct: 0 });
  });
});

describe("play again (AC-051)", () => {
  it("takes everyone back to the lobby with the same teams and settings", () => {
    const room = new TeamDriver({ minutes: 10 }).fill(2).teams(["hoa", "minh"], ["lan"]).begin();
    room.turn(true).timeUp().turn(false);
    room.send({ type: "again", userId: "lan" });
    expect(errorTo(room.effects, "lan")).toBe(TEAM_MESSAGES.hostOnly);
    room.send({ type: "again", userId: "minh" });
    expect(room.state).toMatchObject({ phase: "lobby", teams: { A: ["hoa", "minh"], B: ["lan"] }, round: 0, rounds: [], winner: null, deckSizes: [] });
    expect(room.state.settings.minutes).toBe(10);
    expect(room.state.players.every((p) => p.answered === 0)).toBe(true);
    room.begin();
    expect(room.state).toMatchObject({ phase: "question", round: 1 });
  });

  it("drops players who left from the next match", () => {
    const room = new TeamDriver().fill(2).teams(["minh", "hoa"], ["lan"]).begin();
    room.send({ type: "leave", userId: "hoa" });
    room.turn(true).timeUp().turn(false);
    room.send({ type: "again", userId: "minh" });
    expect(room.state.players.map((p) => p.id)).toEqual(["minh", "lan"]);
    expect(room.state.teams).toEqual({ A: ["minh"], B: ["lan"] });
  });

  it("closes the room when the host leaves after the match", () => {
    const room = oneVsOne();
    room.turn(true).timeUp().turn(false);
    room.send({ type: "leave", userId: HOST.id });
    expect(room.state.phase).toBe("closed");
    expect(room.effects).toContainEqual(expect.objectContaining({ type: "close", userId: null, code: CLOSE_CODES.roomClosed }));
  });
});

import { describe, expect, it } from "vitest";
import { CLOSE_CODES } from "./protocol";
import { HOST, PEOPLE, TeamDriver } from "./team-fixtures";
import { nextTeamAlarm, TEAM_GRACE_MS, TEAM_REVEAL_MS, toPublicTeam } from "./team-machine";

const [LAN] = PEOPLE;

/** A = minh, lan, hoa; B = khoa, an. */
function match() {
  return new TeamDriver().fill(4).teams(["minh", "lan", "hoa"], ["khoa", "an"]).begin();
}

describe("a player drops mid-match (AC-042 to AC-044)", () => {
  it("keeps the match running and skips their turns", () => {
    const room = match();
    room.turn(true); // minh; now B (khoa)
    room.send({ type: "disconnect", userId: "lan" });
    expect(room.state.phase).toBe("question");
    expect(toPublicTeam(room.state).players.find((p) => p.id === "lan")?.connected).toBe(false);
    room.turn(true); // khoa
    expect(room.state.turnPlayer).toBe("hoa");
  });

  it("gives an open question to the next teammate with its full time", () => {
    const room = match();
    const question = room.question.itemId;
    room.now += 5_000;
    room.send({ type: "disconnect", userId: "minh" }, 0);
    expect(room.state).toMatchObject({ phase: "question", turnPlayer: "lan", number: 1 });
    expect(room.state.deadline).toBe(room.now + 15_000);
    expect(room.question.itemId).toBe(question);
  });

  it("puts a returning player back in their place in the order", () => {
    const room = match();
    room.send({ type: "disconnect", userId: "lan" });
    room.turn(true).turn(true); // minh, khoa; A now hoa (lan skipped)
    expect(room.state.turnPlayer).toBe("hoa");
    room.send({ type: "join", player: LAN });
    room.turn(true).turn(true); // hoa, an; A wraps to minh, then lan
    expect(room.state.turnPlayer).toBe("minh");
    room.turn(true).turn(true);
    expect(room.state.turnPlayer).toBe("lan");
  });

  it("takes a player who leaves on purpose out of the order, without ending the match", () => {
    const room = match();
    room.send({ type: "leave", userId: "minh" });
    expect(room.effects).toContainEqual({ type: "close", userId: "minh", code: CLOSE_CODES.roomClosed });
    expect(room.state).toMatchObject({ phase: "question", turnPlayer: "lan" });
  });

  it("keeps going when the host drops (AC-046)", () => {
    const room = match();
    room.turn(true);
    room.send({ type: "disconnect", userId: HOST.id });
    expect(room.state.phase).toBe("question");
  });
});

describe("a whole team is gone (AC-045)", () => {
  it("pauses with the clock stopped, then gives the win to the other team after 30 s", () => {
    const room = match();
    room.turn(true); // B's turn
    const left = room.state.roundEndsAt! - room.now;
    room.send({ type: "disconnect", userId: "khoa" }, 0);
    room.send({ type: "disconnect", userId: "an" }, 0);
    expect(room.state).toMatchObject({ phase: "paused", pausedTeam: "B", roundEndsAt: null, roundLeftMs: left });
    expect(nextTeamAlarm(room.state)).toBe(room.now + TEAM_GRACE_MS);
    room.tick();
    expect(room.state).toMatchObject({ phase: "match-end", winner: "A", endReason: "forfeit" });
    expect(room.effects).toContainEqual(expect.objectContaining({ type: "record-team", match: expect.objectContaining({ reason: "forfeit", winner: "A" }) }));
  });

  it("resumes when one of them is back, with the clock and a fresh question time", () => {
    const room = match();
    room.turn(true);
    room.send({ type: "disconnect", userId: "khoa" }, 0);
    room.send({ type: "disconnect", userId: "an" }, 0);
    const left = room.state.roundLeftMs!;
    room.send({ type: "join", player: { id: "an", name: "An", image: null } }, 10_000);
    expect(room.state).toMatchObject({ phase: "question", turnPlayer: "an", pausedTeam: null, number: 2 });
    expect(room.state.roundEndsAt).toBe(room.now + left);
  });

  it("pauses when the last member of the team that is up next drops during a reveal", () => {
    const room = new TeamDriver().fill(2).teams(["minh", "hoa"], ["lan"]).begin();
    room.answer(true);
    room.send({ type: "disconnect", userId: "lan" }, 0);
    expect(room.state).toMatchObject({ phase: "paused", pausedTeam: "B", pausedFrom: "reveal" });
    room.send({ type: "join", player: LAN }, 1_000);
    expect(room.state.phase).toBe("reveal");
    expect(room.state.deadline).toBe(room.now + TEAM_REVEAL_MS);
    room.tick();
    expect(room.state).toMatchObject({ phase: "question", turnTeam: "B", turnPlayer: "lan" });
  });
});

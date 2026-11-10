import { describe, expect, it } from "vitest";
import { CLOSE_CODES } from "./protocol";
import { errorTo, HOST, PEOPLE, START, TeamDriver } from "./team-fixtures";
import { nextTeamAlarm, startProblem, TEAM_GRACE_MS, TEAM_IDLE_MS, TEAM_MESSAGES, toPublicTeam, type TeamRoomEvent } from "./team-machine";

const [LAN, HOA] = PEOPLE;

describe("joining a team room", () => {
  it("seats players up to the room size, unplaced (AC-004, AC-008)", () => {
    const room = new TeamDriver({ size: 3 }).fill(2);
    expect(room.state.players.map((p) => p.id)).toEqual(["minh", "lan", "hoa"]);
    expect(room.state.teams).toEqual({ A: [], B: [] });
    expect(room.effects).toContainEqual({ type: "broadcast" });
  });

  it("refuses a player when the room is full or the match started (AC-005)", () => {
    const full = new TeamDriver({ size: 2 }).fill(1);
    full.send({ type: "join", player: HOA });
    expect(full.effects).toEqual([{ type: "close", userId: "hoa", code: CLOSE_CODES.roomClosed, message: TEAM_MESSAGES.full }]);

    const started = new TeamDriver().fill(1).teams(["minh"], ["lan"]);
    started.send({ type: "start", userId: "minh" });
    started.send({ type: "join", player: HOA });
    expect(started.effects).toEqual([{ type: "close", userId: "hoa", code: CLOSE_CODES.roomClosed, message: TEAM_MESSAGES.started }]);
  });

  it("gives a second tab the same seat", () => {
    const room = new TeamDriver().fill(1);
    room.send({ type: "join", player: LAN });
    expect(room.state.players).toHaveLength(2);
    expect(room.effects).toContainEqual({ type: "replace", userId: "lan" });
  });
});

describe("the host places players (AC-009 to AC-013)", () => {
  it("puts players on teams, moves and removes them", () => {
    const room = new TeamDriver().fill(3).teams(["minh", "lan"], ["hoa"]);
    expect(room.state.teams).toEqual({ A: ["minh", "lan"], B: ["hoa"] });
    room.send({ type: "assign", userId: "minh", target: "lan", team: "B" });
    expect(room.state.teams).toEqual({ A: ["minh"], B: ["hoa", "lan"] });
    room.send({ type: "assign", userId: "minh", target: "hoa", team: null });
    expect(room.state.teams).toEqual({ A: ["minh"], B: ["lan"] });
  });

  it("sets the turn order, only as a reordering of the team", () => {
    const room = new TeamDriver().fill(3).teams(["minh", "lan", "hoa"], []);
    room.send({ type: "order", userId: "minh", team: "A", ids: ["hoa", "minh", "lan"] });
    expect(room.state.teams.A).toEqual(["hoa", "minh", "lan"]);
    for (const ids of [["hoa", "minh"], ["hoa", "hoa", "lan"], ["hoa", "minh", "khoa"]]) {
      const before = room.state;
      room.send({ type: "order", userId: "minh", team: "A", ids });
      expect(room.state).toBe(before);
    }
  });

  it("splits everyone at random as evenly as it can", () => {
    const room = new TeamDriver({ size: 10 }).fill(4);
    room.send({ type: "shuffle", userId: "minh" });
    const { A, B } = room.state.teams;
    expect(A).toHaveLength(3);
    expect(B).toHaveLength(2);
    expect([...A, ...B].sort()).toEqual(["an", "hoa", "khoa", "lan", "minh"]);
  });

  it("allows uneven teams", () => {
    const room = new TeamDriver().fill(4).teams(["minh", "lan", "hoa"], ["khoa", "an"]);
    expect(startProblem(room.state)).toBeNull();
  });

  it("refuses team changes from anyone but the host", () => {
    const room = new TeamDriver().fill(2);
    const events: TeamRoomEvent[] = [
      { type: "assign", userId: "lan", target: "lan", team: "A" },
      { type: "order", userId: "lan", team: "A", ids: [] },
      { type: "shuffle", userId: "lan" },
      { type: "start", userId: "lan" },
    ];
    for (const event of events) {
      const before = room.state;
      room.send(event);
      expect(room.state).toBe(before);
      expect(errorTo(room.effects, "lan")).toBe(TEAM_MESSAGES.hostOnly);
    }
  });
});

describe("starting (AC-014 to AC-016)", () => {
  it("says what is missing before the match can start", () => {
    const room = new TeamDriver().fill(2);
    expect(startProblem(room.state)).toBe("Còn 3 người chưa xếp đội.");
    room.teams(["minh", "lan", "hoa"], []);
    expect(startProblem(room.state)).toBe("Đội B chưa có ai.");
    room.send({ type: "start", userId: "minh" });
    expect(room.state.phase).toBe("lobby");
    expect(errorTo(room.effects, "minh")).toBe("Đội B chưa có ai.");
    room.send({ type: "assign", userId: "minh", target: "lan", team: null });
    room.send({ type: "assign", userId: "minh", target: "minh", team: null });
    room.send({ type: "assign", userId: "minh", target: "minh", team: "B" });
    room.send({ type: "assign", userId: "minh", target: "lan", team: "B" });
    expect(startProblem({ players: room.state.players, teams: { A: [], B: ["minh", "lan", "hoa"] } })).toBe("Đội A chưa có ai.");
  });

  it("keeps a room with only the host unable to start", () => {
    const room = new TeamDriver().fill(0).teams(["minh"], []);
    expect(startProblem(room.state)).toBe("Đội B chưa có ai.");
  });

  it("starts a room that isn't full, with a countdown", () => {
    const room = new TeamDriver({ size: 10 }).fill(1).teams(["minh"], ["lan"]);
    room.send({ type: "start", userId: "minh" });
    expect(room.state).toMatchObject({ phase: "countdown", idleUntil: null });
    expect(room.state.deadline).toBe(room.now + 3_000);
  });
});

describe("settings before the match (AC-049, AC-050)", () => {
  it("lets the host change them, not below the players present", () => {
    const room = new TeamDriver({ size: 6 }).fill(3);
    room.send({ type: "settings", userId: "minh", settings: { ...room.state.settings, minutes: 15, size: 4 } });
    expect(room.state.settings).toMatchObject({ minutes: 15, size: 4 });
    room.send({ type: "settings", userId: "minh", settings: { ...room.state.settings, size: 3 } });
    expect(room.state.settings.size).toBe(4);
    expect(errorTo(room.effects, "minh")).toBe(TEAM_MESSAGES.sizeTooSmall(4));
    room.send({ type: "settings", userId: "lan", settings: { ...room.state.settings, minutes: 5 } });
    expect(room.state.settings.minutes).toBe(15);
  });
});

describe("leaving the lobby (AC-046, AC-047)", () => {
  it("frees a player's seat and takes them off their team", () => {
    const room = new TeamDriver().fill(2).teams(["minh", "lan"], ["hoa"]);
    room.send({ type: "leave", userId: "lan" });
    expect(room.state.players.map((p) => p.id)).toEqual(["minh", "hoa"]);
    expect(room.state.teams).toEqual({ A: ["minh"], B: ["hoa"] });
  });

  it("closes the room when the host leaves", () => {
    const room = new TeamDriver().fill(2);
    room.send({ type: "leave", userId: "minh" });
    expect(room.state.phase).toBe("closed");
    expect(room.effects).toContainEqual({ type: "close", userId: null, code: CLOSE_CODES.roomClosed, message: TEAM_MESSAGES.closed });
  });

  it("removes a player who dropped and isn't back in 30 s", () => {
    const room = new TeamDriver().fill(2).teams(["lan"], []);
    room.send({ type: "disconnect", userId: "lan" });
    expect(nextTeamAlarm(room.state)).toBe(room.now + TEAM_GRACE_MS);
    room.send({ type: "tick" }, TEAM_GRACE_MS);
    expect(room.state.players.map((p) => p.id)).toEqual(["minh", "hoa"]);
    expect(room.state.teams.A).toEqual([]);
  });

  it("closes a room that never starts", () => {
    const room = new TeamDriver().fill(1);
    room.send({ type: "tick" }, START + TEAM_IDLE_MS - room.now);
    expect(room.state.phase).toBe("closed");
  });
});

describe("the public lobby", () => {
  it("shows settings, players and teams without answers", () => {
    const room = new TeamDriver().fill(2).teams(["minh"], ["lan"]);
    const view = toPublicTeam(room.state);
    expect(view).toMatchObject({ kind: "team", hostId: HOST.id, phase: "lobby", question: null, teams: { A: { members: ["minh"] }, B: { members: ["lan"] } } });
    expect(view.players).toHaveLength(3);
  });
});

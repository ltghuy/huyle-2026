import { describe, expect, it } from "vitest";
import { listingOf, sameListing } from "./community";
import { createRoom, reduce, toPublic, type RoomEvent, type RoomState } from "./machine";
import { HOST, PEOPLE, TeamDriver } from "./team-fixtures";
import { toPublicTeam } from "./team-machine";

const T0 = 1_800_000_000_000;
const MINH = { id: "minh", name: "Minh Anh", image: "https://example.test/minh.png" };
const LAN = { id: "lan", name: "Lan", image: null };
const SETTINGS = { mode: "mixed", level: "A1", rounds: 3, seconds: 15 } as const;

function run(state: RoomState, events: RoomEvent[]) {
  let result = { state, effects: [] as ReturnType<typeof reduce>["effects"] };
  for (const [i, event] of events.entries()) result = reduce(result.state, event, T0 + 100 * (i + 1));
  return result;
}

/** A duel lobby with the creator connected. */
function duel(): RoomState {
  const created = createRoom({ code: "K7P2QX", settings: SETTINGS, creator: MINH, seed: 1, now: T0 });
  return run(created, [{ type: "join", player: MINH }]).state;
}

describe("making a duel lobby public (041 AC-001 to AC-004)", () => {
  it("lets only the creator publish, while the second seat is free, and tells the room", () => {
    const published = run(duel(), [{ type: "publish", userId: "minh" }]);
    expect(published.state.public).toBe(true);
    expect(published.effects).toEqual([{ type: "broadcast" }]);
    expect(toPublic(published.state).public).toBe(true);
    // Again: nothing changes.
    expect(run(published.state, [{ type: "publish", userId: "minh" }]).effects).toEqual([]);

    const full = run(duel(), [{ type: "join", player: LAN }, { type: "publish", userId: "minh" }]);
    expect(full.state.public).toBeFalsy();
    expect(run(duel(), [{ type: "publish", userId: "lan" }]).state.public).toBeFalsy();
  });

  it("lists it with a free seat, hides it when full, shows it again when the seat frees up", () => {
    const published = run(duel(), [{ type: "publish", userId: "minh" }]).state;
    expect(listingOf(published)).toEqual({
      kind: "duel",
      code: "K7P2QX",
      level: "A1",
      settings: SETTINGS,
      host: { id: "minh", name: "Minh Anh", image: "https://example.test/minh.png" },
      taken: 1,
      seats: 2,
    });
    const joined = run(published, [{ type: "join", player: LAN }]).state;
    expect(joined.phase).toBe("ready");
    expect(listingOf(joined)).toBeNull();
    const left = run(joined, [{ type: "leave", userId: "lan" }]).state;
    expect(left.phase).toBe("lobby");
    expect(listingOf(left)?.taken).toBe(1);
  });

  it("is no longer public once the match starts", () => {
    const started = run(duel(), [
      { type: "publish", userId: "minh" },
      { type: "join", player: LAN },
      { type: "ready", userId: "minh" },
      { type: "ready", userId: "lan" },
    ]).state;
    expect(started.phase).toBe("countdown");
    expect(started.public).toBe(false);
    expect(listingOf(started)).toBeNull();
  });

  it("isn't listed unless public, and old rooms without the flag aren't", () => {
    expect(listingOf(duel())).toBeNull();
    const old: RoomState = { ...duel(), public: true };
    delete old.public;
    expect(listingOf(old)).toBeNull();
    expect(listingOf(null)).toBeNull();
  });

  it("sees a settings change as a different listing (AC-005)", () => {
    const published = run(duel(), [{ type: "publish", userId: "minh" }]).state;
    const changed = run(published, [{ type: "settings", userId: "minh", settings: { ...SETTINGS, level: "B1" } }]).state;
    expect(listingOf(changed)?.level).toBe("B1");
    expect(sameListing(listingOf(published), listingOf(changed))).toBe(false);
    expect(sameListing(listingOf(published), listingOf(published))).toBe(true);
  });
});

describe("making a team lobby public (041 AC-001 to AC-004)", () => {
  it("lets only the host publish while a seat is free, and lists the seats taken", () => {
    const room = new TeamDriver({ size: 3 }).fill(1);
    room.send({ type: "publish", userId: PEOPLE[0].id });
    expect(room.state.public).toBeFalsy();
    room.send({ type: "publish", userId: HOST.id });
    expect(room.state.public).toBe(true);
    expect(toPublicTeam(room.state).public).toBe(true);
    expect(listingOf(room.state)).toMatchObject({ kind: "team", level: "A2", host: { id: "minh", name: "Minh" }, taken: 2, seats: 3 });
  });

  it("hides a full room, lists it again when someone leaves, and drops it for good at the start", () => {
    const room = new TeamDriver({ size: 3 }).fill(1);
    room.send({ type: "publish", userId: HOST.id });
    room.send({ type: "join", player: PEOPLE[1] });
    expect(listingOf(room.state)).toBeNull();
    room.send({ type: "leave", userId: PEOPLE[1].id });
    expect(listingOf(room.state)?.taken).toBe(2);

    room.teams([HOST.id], [PEOPLE[0].id]).send({ type: "start", userId: HOST.id });
    expect(room.state.public).toBe(false);
    expect(listingOf(room.state)).toBeNull();
  });

  it("refuses to publish a full room", () => {
    const room = new TeamDriver({ size: 2 }).fill(1);
    room.send({ type: "publish", userId: HOST.id });
    expect(room.state.public).toBeFalsy();
    expect(room.effects).toEqual([]);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { historyEntries, teamHistoryEntries } from "@/learning/arena/history";
import type { FinishedMatch } from "@/learning/arena/machine";
import type { FinishedTeamMatch } from "@/learning/arena/team-machine";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { listHistory, recordMatch } from "./history";
import { recordResult } from "./stats";

const NOW = Date.parse("2026-11-05T13:14:00Z");

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"], ["khoa", "Khoa"]]) {
    sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', ${NOW}, ${NOW})`);
  }
});

function match(endedAt: number, winnerId = "minh", opponent = { id: "lan", name: "Lan", image: null as string | null }): FinishedMatch {
  return {
    endedAt,
    reason: "won",
    settings: { mode: "listen", level: "A2", rounds: 1, seconds: 15 },
    winnerId,
    players: [
      { id: "minh", name: "Minh Anh", image: "https://example.com/minh.png", roundsWon: winnerId === "minh" ? 1 : 0 },
      { ...opponent, roundsWon: winnerId === "minh" ? 0 : 1 },
    ],
    rounds: [{ round: 1, scores: { minh: 7, [opponent.id]: 5 }, winnerId }],
  };
}

const save = (m: FinishedMatch, id: string) => recordMatch(db, historyEntries(m, id));

describe("arena match history (feature 025)", () => {
  it("saves a match for both players and reads it back from each side, with the record (AC-001, AC-003)", async () => {
    await recordResult(db, "minh", "lan", NOW);
    await save(match(NOW), "m1");

    const minh = await listHistory(db, "minh");
    expect(minh.stats).toEqual({ wins: 1, losses: 0, streak: 1, bestStreak: 1 });
    expect(minh.matches).toEqual([
      {
        id: "m1",
        endedAt: NOW,
        won: true,
        forfeit: false,
        score: { mine: 1, theirs: 0 },
        opponent: { id: "lan", name: "Lan", image: null },
        // History doesn't record the question time (feature 028).
        settings: { mode: "listen", level: "A2", rounds: 1 },
        rounds: [{ round: 1, mine: 7, theirs: 5, won: true, suddenDeath: false, onTime: false }],
      },
    ]);
    const lan = await listHistory(db, "lan");
    expect(lan.matches[0]).toMatchObject({ won: false, score: { mine: 0, theirs: 1 }, opponent: { id: "minh", name: "Minh Anh", image: "https://example.com/minh.png" } });
    expect(lan.matches[0].rounds[0]).toMatchObject({ mine: 5, theirs: 7, won: false });
  });

  it("is empty, with zero stats, before a learner's first match (AC-006)", async () => {
    expect(await listHistory(db, "khoa")).toEqual({ stats: { wins: 0, losses: 0, streak: 0, bestStreak: 0 }, matches: [] });
  });

  it("lists newest first, in a stable order when two matches end at the same time", async () => {
    await save(match(NOW), "a");
    await save(match(NOW + 1_000), "b");
    await save(match(NOW + 1_000), "c");
    expect((await listHistory(db, "minh")).matches.map((m) => m.id)).toEqual(["c", "b", "a"]);
  });

  it("keeps each learner's 50 newest matches (AC-005)", async () => {
    for (let i = 0; i < 55; i++) await save(match(NOW + i), `m${String(i).padStart(2, "0")}`);
    const { matches } = await listHistory(db, "minh");
    expect(matches).toHaveLength(50);
    expect(matches[0].id).toBe("m54");
    expect(matches.at(-1)!.id).toBe("m05");
    expect((await listHistory(db, "lan")).matches).toHaveLength(50);
  });

  it("prunes per learner: one with fewer matches keeps them all", async () => {
    for (let i = 0; i < 52; i++) await save(match(NOW + i), `l${i}`);
    await save(match(NOW + 100, "minh", { id: "khoa", name: "Khoa", image: null }), "k1");
    expect((await listHistory(db, "khoa")).matches.map((m) => m.id)).toEqual(["k1"]);
    expect((await listHistory(db, "minh")).matches).toHaveLength(50);
  });

  it("ignores the same match saved twice", async () => {
    await save(match(NOW), "m1");
    await save(match(NOW), "m1");
    expect((await listHistory(db, "minh")).matches).toHaveLength(1);
  });

  it("removes a learner's own history with their account", async () => {
    await save(match(NOW), "m1");
    sqlite.exec("DELETE FROM user WHERE id = 'minh'");
    expect(sqlite.prepare("SELECT count(*) AS n FROM arena_matches WHERE user_id = 'minh'").get()).toEqual({ n: 0 });
  });

  it("shows a match without its rounds when they can't be read", async () => {
    await save(match(NOW), "m1");
    sqlite.exec("UPDATE arena_matches SET rounds = 'oops' WHERE user_id = 'minh'");
    expect((await listHistory(db, "minh")).matches[0]).toMatchObject({ id: "m1", rounds: [] });
  });
});

function teamMatch(endedAt: number, winner: "A" | "B" | "draw" = "A"): FinishedTeamMatch {
  return {
    endedAt,
    reason: "won",
    settings: { mode: "recall", level: "A2", rounds: 3, seconds: 25, size: 4, minutes: 5 },
    winner,
    teams: { A: [{ id: "minh", name: "Minh Anh", image: null }, { id: "khoa", name: "Khoa", image: null }], B: [{ id: "lan", name: "Lan", image: null }] },
    roundsWon: { A: 2, B: 1 },
    rounds: [
      { round: 1, scores: { A: 9, B: 7 }, winner: "A", suddenDeath: false },
      { round: 2, scores: { A: 4, B: 6 }, winner: "B", suddenDeath: false },
      { round: 3, scores: { A: 6, B: 5 }, winner: "A", suddenDeath: true },
    ],
  };
}

const saveTeam = (m: FinishedTeamMatch, id: string) => {
  const { entries, members } = teamHistoryEntries(m, id);
  return recordMatch(db, entries, members);
};

describe("team match history (feature 039, AC-040)", () => {
  it("saves a row per player with their team's side and both teams' players", async () => {
    await saveTeam(teamMatch(NOW), "t1");
    const lan = (await listHistory(db, "lan")).matches[0];
    expect(lan).toMatchObject({
      id: "t1",
      won: false,
      opponent: null,
      score: { mine: 1, theirs: 2 },
      settings: { mode: "recall", level: "A2", rounds: 3 },
      team: { mine: "B", draw: false, members: { A: [{ id: "minh" }, { id: "khoa" }], B: [{ id: "lan", name: "Lan" }] } },
    });
    expect(lan.rounds[0]).toEqual({ round: 1, mine: 7, theirs: 9, won: false, suddenDeath: false, onTime: false });
    expect((await listHistory(db, "khoa")).matches[0]).toMatchObject({ won: true, team: { mine: "A" } });
  });

  it("never touches the Arena record", async () => {
    await saveTeam(teamMatch(NOW), "t1");
    expect((await listHistory(db, "minh")).stats).toEqual({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  });

  it("keeps a draw as neither won nor lost", async () => {
    await saveTeam(teamMatch(NOW, "draw"), "t1");
    expect((await listHistory(db, "minh")).matches[0]).toMatchObject({ won: false, team: { draw: true } });
  });

  it("leaves duel entries without a team", async () => {
    await save(match(NOW), "m1");
    expect((await listHistory(db, "minh")).matches[0].team).toBeUndefined();
  });

  it("drops a match's players once no owner keeps it", async () => {
    await saveTeam(teamMatch(NOW), "t1");
    sqlite.exec("DELETE FROM arena_matches WHERE match_id = 't1'");
    await save(match(NOW + 1), "m1");
    expect(sqlite.prepare("SELECT count(*) AS n FROM arena_match_players").get()).toEqual({ n: 0 });
  });

  it("removes a deleted learner from the teams others see", async () => {
    await saveTeam(teamMatch(NOW), "t1");
    sqlite.exec("DELETE FROM user WHERE id = 'lan'");
    const minh = (await listHistory(db, "minh")).matches[0];
    expect(minh.team?.members.B).toEqual([]);
    expect(sqlite.prepare("SELECT count(*) AS n FROM arena_matches").get()).toEqual({ n: 2 });
  });
});

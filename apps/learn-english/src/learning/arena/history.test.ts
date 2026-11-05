import { describe, expect, it } from "vitest";
import { historyEntries } from "./history";
import type { FinishedMatch } from "./machine";

const MATCH: FinishedMatch = {
  endedAt: 1_800_000_000_000,
  reason: "won",
  settings: { mode: "mixed", level: "A2", rounds: 3 },
  winnerId: "minh",
  players: [
    { id: "minh", name: "Minh Anh", image: "https://example.com/minh.png", roundsWon: 2 },
    { id: "lan", name: "Lan", image: null, roundsWon: 1 },
  ],
  rounds: [
    { round: 1, scores: { minh: 5, lan: 3 }, winnerId: "minh" },
    { round: 2, scores: { minh: 2, lan: 5 }, winnerId: "lan" },
    { round: 3, scores: { minh: 7, lan: 6 }, winnerId: "minh", suddenDeath: true },
  ],
};

describe("historyEntries (feature 025, AC-001)", () => {
  it("gives each player their own side of the match", () => {
    const [minh, lan] = historyEntries(MATCH, "m1");
    expect(minh).toEqual({
      matchId: "m1",
      userId: "minh",
      opponentId: "lan",
      opponentName: "Lan",
      opponentImage: null,
      won: true,
      forfeit: false,
      roundsWon: 2,
      opponentRoundsWon: 1,
      rounds: [
        { round: 1, mine: 5, theirs: 3, won: true, suddenDeath: false, onTime: false },
        { round: 2, mine: 2, theirs: 5, won: false, suddenDeath: false, onTime: false },
        { round: 3, mine: 7, theirs: 6, won: true, suddenDeath: true, onTime: false },
      ],
      settings: MATCH.settings,
      endedAt: MATCH.endedAt,
    });
    expect(lan).toMatchObject({ userId: "lan", opponentId: "minh", opponentName: "Minh Anh", opponentImage: "https://example.com/minh.png", won: false, roundsWon: 1, opponentRoundsWon: 2 });
    expect(lan.rounds.map((r) => [r.mine, r.theirs, r.won])).toEqual([
      [3, 5, false],
      [5, 2, true],
      [6, 7, false],
    ]);
  });

  it("marks a round level on points as decided by answer time", () => {
    const match: FinishedMatch = { ...MATCH, rounds: [{ round: 1, scores: { minh: 6, lan: 6 }, winnerId: "lan", suddenDeath: true }] };
    expect(historyEntries(match, "m2")[0].rounds[0]).toMatchObject({ won: false, suddenDeath: true, onTime: true });
  });

  it("keeps only the finished rounds of a match lost by forfeit (AC-015)", () => {
    const match: FinishedMatch = { ...MATCH, reason: "forfeit", winnerId: "lan", rounds: MATCH.rounds.slice(0, 1), players: [{ ...MATCH.players[0], roundsWon: 1 }, { ...MATCH.players[1], roundsWon: 0 }] };
    const [minh, lan] = historyEntries(match, "m3");
    expect(minh).toMatchObject({ won: false, forfeit: true, roundsWon: 1, opponentRoundsWon: 0 });
    expect(minh.rounds).toHaveLength(1);
    expect(lan).toMatchObject({ won: true, forfeit: true });
  });
});

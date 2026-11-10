// Arena match history (feature 025): a finished match as one entry per player,
// each seen from that player's side. Pure; the room adds the id and saves them.
import type { FinishedMatch } from "./machine";
import type { ArenaSettings } from "./protocol";
import type { FinishedTeamMatch } from "./team-machine";
import type { Team } from "./team-protocol";

/** Keep this many matches per learner; older ones are dropped (AC-005). */
export const HISTORY_LIMIT = 50;

export interface HistoryRound {
  round: number;
  /** The owner's points, then the opponent's. */
  mine: number;
  theirs: number;
  won: boolean;
  suddenDeath: boolean;
  /** Level on points: decided by answer time. */
  onTime: boolean;
}

export interface HistoryEntry {
  matchId: string;
  userId: string;
  /** Null for team matches, which list their players apart (feature 039). */
  opponentId: string | null;
  opponentName: string | null;
  opponentImage: string | null;
  won: boolean;
  forfeit: boolean;
  roundsWon: number;
  opponentRoundsWon: number;
  rounds: HistoryRound[];
  settings: Pick<ArenaSettings, "mode" | "level" | "rounds">;
  endedAt: number;
  /** Team matches only (feature 039): the owner's team and whether the match ended level. */
  team?: Team;
  draw?: boolean;
}

/** One player of a team match, in their team's turn order (feature 039). */
export interface HistoryMember {
  matchId: string;
  userId: string;
  team: Team;
  name: string;
  image: string | null;
  position: number;
}

/** Both players' entries for one match, in the match's player order. */
export function historyEntries(match: FinishedMatch, matchId: string): HistoryEntry[] {
  return match.players.map((owner) => {
    const opponent = match.players.find((p) => p.id !== owner.id)!;
    return {
      matchId,
      userId: owner.id,
      opponentId: opponent.id,
      opponentName: opponent.name,
      opponentImage: opponent.image,
      won: match.winnerId === owner.id,
      forfeit: match.reason === "forfeit",
      roundsWon: owner.roundsWon,
      opponentRoundsWon: opponent.roundsWon,
      rounds: match.rounds.map((round) => {
        const mine = round.scores[owner.id] ?? 0;
        const theirs = round.scores[opponent.id] ?? 0;
        return { round: round.round, mine, theirs, won: round.winnerId === owner.id, suddenDeath: round.suddenDeath === true, onTime: mine === theirs };
      }),
      settings: match.settings,
      endedAt: match.endedAt,
    };
  });
}

/**
 * A team match's entries (feature 039, AC-040): one per player, seen from their team's side, with
 * the round points of their team first, and the members of both teams.
 */
export function teamHistoryEntries(match: FinishedTeamMatch, matchId: string): { entries: HistoryEntry[]; members: HistoryMember[] } {
  const members: HistoryMember[] = (["A", "B"] as const).flatMap((team) =>
    match.teams[team].map((player, position) => ({ matchId, userId: player.id, team, name: player.name, image: player.image, position })),
  );
  const entries = members.map(({ userId, team }): HistoryEntry => {
    const rival: Team = team === "A" ? "B" : "A";
    return {
      matchId,
      userId,
      opponentId: null,
      opponentName: null,
      opponentImage: null,
      won: match.winner === team,
      forfeit: match.reason === "forfeit",
      roundsWon: match.roundsWon[team],
      opponentRoundsWon: match.roundsWon[rival],
      rounds: match.rounds.map((round) => ({
        round: round.round,
        mine: round.scores[team],
        theirs: round.scores[rival],
        won: round.winner === team,
        suddenDeath: round.suddenDeath,
        onTime: false,
      })),
      settings: match.settings,
      endedAt: match.endedAt,
      team,
      draw: match.winner === "draw",
    };
  });
  return { entries, members };
}

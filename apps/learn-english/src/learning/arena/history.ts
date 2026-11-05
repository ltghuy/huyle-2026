// Arena match history (feature 025): a finished match as one entry per player,
// each seen from that player's side. Pure; the room adds the id and saves them.
import type { FinishedMatch } from "./machine";
import type { ArenaSettings } from "./protocol";

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
  opponentId: string;
  opponentName: string;
  opponentImage: string | null;
  won: boolean;
  forfeit: boolean;
  roundsWon: number;
  opponentRoundsWon: number;
  rounds: HistoryRound[];
  settings: ArenaSettings;
  endedAt: number;
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

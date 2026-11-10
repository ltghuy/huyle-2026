// Shared bits of the team screens ("Đấu đội", feature 039): team names, the
// letter badge and each team's token colors. Đội A uses `primary`, Đội B
// `arena-rival`; a team is always shown with its letter too, never by color alone.
import type { PublicTeamRoom, Team } from "@/learning/arena/team-protocol";
import { cn } from "@/lib/utils";

export const TEAM_NAME: Record<Team, string> = { A: "Đội A", B: "Đội B" };

/** Text, soft background and border classes of each team. */
export const TEAM_TONE: Record<Team, { text: string; soft: string; border: string; solid: string }> = {
  A: { text: "text-primary", soft: "bg-primary/10", border: "border-primary", solid: "bg-primary text-primary-foreground" },
  B: { text: "text-arena-rival", soft: "bg-arena-rival/10", border: "border-arena-rival", solid: "bg-arena-rival text-background" },
};

/** The team's letter in a filled circle; screen readers hear the team name. */
export function TeamBadge({ team, className }: { team: Team; className?: string }) {
  return (
    <span className={cn("inline-grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold", TEAM_TONE[team].solid, className)}>
      <span aria-hidden>{team}</span>
      <span className="sr-only">{TEAM_NAME[team]}</span>
    </span>
  );
}

export type TeamPlayerView = PublicTeamRoom["players"][number];

/** A player of the room by id. */
export function teamPlayer(room: PublicTeamRoom, id: string): TeamPlayerView | undefined {
  return room.players.find((p) => p.id === id);
}

/** The team a player is on, or null when unplaced. */
export function teamOfPlayer(room: PublicTeamRoom, id: string): Team | null {
  if (room.teams.A.members.includes(id)) return "A";
  if (room.teams.B.members.includes(id)) return "B";
  return null;
}

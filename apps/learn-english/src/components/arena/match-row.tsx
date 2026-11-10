"use client";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { ArenaMatch } from "@/server/arena/arena.schema";
import { cn } from "@/lib/utils";
import { MatchDetails, teamForfeitLabel, TeamResultBadge, teamResultLabel, teamScoreLabel } from "./match-details";
import { DELETED_PLAYER, forfeitLabel, OpponentAvatar, resultLabel, ResultBadge, scoreLabel } from "./match-parts";
import { matchWhen } from "./match-when";
import { settingsLine } from "./settings-fields";
import { useAccount } from "@/hooks/use-account";
import { PlayerAvatar } from "./players";

const ROW_CLASS =
  "grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-card p-3 text-left outline-none transition-colors duration-200 hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

type TeamEntry = NonNullable<ArenaMatch["team"]>;
type Member = TeamEntry["members"]["A"][number];

/** Faces shown per team before "+N". */
const FACES = 3;

/** "Bạn, Lan" or "Vy, Hoa +2": a team's players, the learner first as "Bạn". */
export function teamNames(members: Member[], me: string | null): string {
  const sorted = [...members].sort((a, b) => Number(b.id === me) - Number(a.id === me));
  const names = sorted.slice(0, FACES).map((m) => (m.id === me ? "Bạn" : m.name));
  const more = sorted.length - FACES;
  if (sorted.length === 0) return DELETED_PLAYER;
  return more > 0 ? `${names.join(", ")} +${more}` : names.join(", ");
}

/** A team's first faces, overlapping (feature 039, AC-054). */
function TeamFaces({ members, mine, me }: { members: Member[]; mine: boolean; me: string | null }) {
  const sorted = [...members].sort((a, b) => Number(b.id === me) - Number(a.id === me)).slice(0, FACES);
  return (
    <span aria-hidden className="flex -space-x-3">
      {sorted.map((member) => (
        <PlayerAvatar key={member.id} player={member} you={mine} className="size-8 text-xs ring-offset-card" />
      ))}
    </span>
  );
}

/** A team match in the list (feature 039, AC-040, AC-054): both teams' players, the result and the rounds. */
function TeamMatchRow({ match, team }: { match: ArenaMatch; team: TeamEntry }) {
  const me = useAccount().account?.userId ?? null;
  const when = matchWhen(match.endedAt);
  const forfeit = teamForfeitLabel(match, team);
  const theirs = team.mine === "A" ? "B" : "A";
  const ours = teamNames(team.members[team.mine], me);
  const rivals = teamNames(team.members[theirs], me);
  const label = `${teamResultLabel(match, team)} ${teamScoreLabel(match, team)}, Đấu đội: ${ours} với ${rivals}, ${when}${forfeit ? `, ${forfeit.toLowerCase()}` : ""}`;
  return (
    <li>
      <Dialog>
        <DialogTrigger aria-label={label} className={cn(ROW_CLASS, "grid-cols-[minmax(0,1fr)_auto]")}>
          <span className="grid min-w-0 gap-1.5">
            <span className="flex min-w-0 items-center gap-2">
              <TeamFaces members={team.members[team.mine]} mine me={me} />
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">vs</span>
              <TeamFaces members={team.members[theirs]} mine={false} me={me} />
            </span>
            <span className="truncate font-semibold">
              {ours} <span className="font-normal text-muted-foreground">vs</span> {rivals}
            </span>
            <span className="text-sm text-muted-foreground">
              Đấu đội · {settingsLine(match.settings)} · {when}
            </span>
            {forfeit ? <span className="text-xs text-muted-foreground">{forfeit}</span> : null}
          </span>
          <span className="grid justify-items-end gap-1">
            <TeamResultBadge match={match} team={team} />
            <span className="text-sm font-bold whitespace-nowrap tabular-nums">{teamScoreLabel(match, team)}</span>
          </span>
        </DialogTrigger>
        <MatchDetails match={match} name="Đấu đội" when={when} />
      </Dialog>
    </li>
  );
}

/** One past match (AC-003, AC-004): opening it shows the rounds (AC-014). */
export function MatchRow({ match }: { match: ArenaMatch }) {
  if (match.team) return <TeamMatchRow match={match} team={match.team} />;
  return <DuelMatchRow match={match} />;
}

function DuelMatchRow({ match }: { match: ArenaMatch }) {
  const name = match.opponent?.name ?? DELETED_PLAYER;
  const when = matchWhen(match.endedAt);
  const forfeit = forfeitLabel(match);
  const label = `${resultLabel(match)} ${scoreLabel(match)} với ${name}, ${when}${forfeit ? `, ${forfeit.toLowerCase()}` : ""}`;

  return (
    <li>
      <Dialog>
        <DialogTrigger aria-label={label} className={ROW_CLASS}>
          <OpponentAvatar match={match} />
          <span className="grid min-w-0 gap-0.5">
            <span className={cn("truncate font-semibold", !match.opponent && "font-normal text-muted-foreground italic")}>{name}</span>
            <span className="text-sm text-muted-foreground">
              {settingsLine(match.settings)} · {when}
            </span>
            {forfeit ? <span className="text-xs text-muted-foreground">{forfeit}</span> : null}
          </span>
          <span className="grid justify-items-end gap-1">
            <ResultBadge match={match} />
            <span className="text-lg font-bold tabular-nums">{scoreLabel(match)}</span>
          </span>
        </DialogTrigger>
        <MatchDetails match={match} name={name} when={when} />
      </Dialog>
    </li>
  );
}

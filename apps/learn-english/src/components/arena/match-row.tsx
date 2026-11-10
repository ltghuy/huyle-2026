"use client";

import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { ArenaMatch } from "@/server/arena/arena.schema";
import { cn } from "@/lib/utils";
import { MatchDetails, teamForfeitLabel, TeamResultBadge, teamResultLabel, teamScoreLabel } from "./match-details";
import { DELETED_PLAYER, forfeitLabel, OpponentAvatar, resultLabel, ResultBadge, scoreLabel } from "./match-parts";
import { matchWhen } from "./match-when";
import { settingsLine } from "./settings-fields";
import { TeamBadge } from "./team-parts";

const ROW_CLASS =
  "grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-card p-3 text-left outline-none transition-colors duration-200 hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

/** A team match in the list (feature 039, AC-040): "Đấu đội", the result and the teams' rounds. */
function TeamMatchRow({ match, team }: { match: ArenaMatch; team: NonNullable<ArenaMatch["team"]> }) {
  const when = matchWhen(match.endedAt);
  const forfeit = teamForfeitLabel(match, team);
  const label = `${teamResultLabel(match, team)} ${teamScoreLabel(match, team)}, Đấu đội, ${when}${forfeit ? `, ${forfeit.toLowerCase()}` : ""}`;
  return (
    <li>
      <Dialog>
        <DialogTrigger aria-label={label} className={ROW_CLASS}>
          <TeamBadge team={team.mine} className="size-10 text-base" />
          <span className="grid min-w-0 gap-0.5">
            <span className="truncate font-semibold">Đấu đội</span>
            <span className="text-sm text-muted-foreground">
              {settingsLine(match.settings)} · {when}
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

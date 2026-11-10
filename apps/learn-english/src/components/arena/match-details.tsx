"use client";

import { Handshake, Trophy, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ArenaMatch, ArenaMatchMember } from "@/server/arena/arena.schema";
import { FriendButton } from "@/components/social/friend-button";
import { cn } from "@/lib/utils";
import { forfeitLabel, OpponentAvatar, resultLabel, scoreLabel } from "./match-parts";
import { PlayerAvatar } from "./players";
import { settingsLine } from "./settings-fields";
import { TEAM_NAME, TEAM_TONE, TeamBadge } from "./team-parts";

type Round = ArenaMatch["rounds"][number];

function roundNote(round: Round): string | null {
  if (round.onTime) return "Hòa điểm, phân thắng bại nhờ trả lời nhanh hơn";
  if (round.suddenDeath) return "Phân thắng bại ở câu quyết định";
  return null;
}

/** One match's rounds (AC-014, AC-015); closing returns focus to its row (AC-016). A team match shows its teams (feature 039). */
export function MatchDetails({ match, name, when }: { match: ArenaMatch; name: string; when: string }) {
  if (match.team) return <TeamMatchDetails match={match} team={match.team} when={when} />;
  const forfeit = forfeitLabel(match);
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        {/* pr-8 keeps the friend button clear of the dialog's close button in the corner. */}
        <div className="flex items-center gap-3 pr-8">
          <OpponentAvatar match={match} />
          <div className="grid min-w-0 gap-0.5">
            <DialogTitle className="tabular-nums">
              {resultLabel(match)} {scoreLabel(match)}
            </DialogTitle>
            <DialogDescription className="truncate">với {name}</DialogDescription>
          </div>
          {/* A friend request to a past opponent, even while they're away (feature 031, AC-002). */}
          {match.opponent ? <FriendButton userId={match.opponent.id} className="ml-auto shrink-0" /> : null}
        </div>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        {settingsLine(match.settings)} · {when}
      </p>
      {match.rounds.length > 0 ? (
        <ol aria-label="Điểm từng hiệp" className="grid gap-2">
          {match.rounds.map((round) => (
            <RoundLine key={round.round} round={round} name={name} />
          ))}
        </ol>
      ) : (
        <p className="text-sm">{forfeit ?? "Trận kết thúc"} trước khi xong hiệp nào.</p>
      )}
      {forfeit && match.rounds.length > 0 ? <p className="text-sm text-muted-foreground">{forfeit}: trận kết thúc trước khi đấu hết các hiệp.</p> : null}
    </DialogContent>
  );
}

function RoundLine({ round, name }: { round: Round; name: string }) {
  const note = roundNote(round);
  return (
    <li className={cn("grid gap-0.5 rounded-xl border px-3 py-2", round.won ? "border-primary/50 bg-primary/10" : "border-arena-rival/40 bg-arena-rival/10")}>
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">Hiệp {round.round}</span>
        <span className="font-bold tabular-nums">
          {round.mine}–{round.theirs}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">
        {round.won ? "Bạn thắng" : `${name} thắng`}
        {note ? ` · ${note}` : ""}
      </span>
    </li>
  );
}

// ── Team matches ("Đấu đội", feature 039, AC-040) ─────────────────────────────

type TeamEntry = NonNullable<ArenaMatch["team"]>;
type TeamLetter = TeamEntry["mine"];

const OTHER_TEAM: Record<TeamLetter, TeamLetter> = { A: "B", B: "A" };

/** "Thắng", "Thua" or "Hòa": a draw is saved with `won` false. */
export function teamResultLabel(match: ArenaMatch, team: TeamEntry): string {
  if (team.draw) return "Hòa";
  return match.won ? "Thắng" : "Thua";
}

/** Rounds won from the learner's side: "Đội A 2–1 Đội B". */
export function teamScoreLabel(match: ArenaMatch, team: TeamEntry): string {
  return `${TEAM_NAME[team.mine]} ${match.score.mine}–${match.score.theirs} ${TEAM_NAME[OTHER_TEAM[team.mine]]}`;
}

/** Who left a team match, from the learner's side. */
export function teamForfeitLabel(match: ArenaMatch, team: TeamEntry): string | null {
  if (!match.forfeit) return null;
  return match.won ? `${TEAM_NAME[OTHER_TEAM[team.mine]]} rời trận` : "Đội bạn rời trận";
}

/** The result as icon + word, so it never rests on color alone. */
export function TeamResultBadge({ match, team }: { match: ArenaMatch; team: TeamEntry }) {
  const Icon = team.draw ? Handshake : match.won ? Trophy : X;
  return (
    <Badge variant={match.won && !team.draw ? "default" : "secondary"} className="gap-1">
      <Icon aria-hidden />
      {teamResultLabel(match, team)}
    </Badge>
  );
}

function TeamMatchDetails({ match, team, when }: { match: ArenaMatch; team: TeamEntry; when: string }) {
  const forfeit = teamForfeitLabel(match, team);
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3 pr-8">
          <TeamBadge team={team.mine} className="size-10 text-base" />
          <div className="grid min-w-0 gap-0.5">
            <DialogTitle className="tabular-nums">
              {teamResultLabel(match, team)} {teamScoreLabel(match, team)}
            </DialogTitle>
            <DialogDescription>Đấu đội</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        {settingsLine(match.settings)} · {when}
      </p>
      {match.rounds.length > 0 ? (
        <ol aria-label="Điểm từng hiệp" className="grid gap-2">
          {match.rounds.map((round) => (
            <TeamRoundLine key={round.round} round={round} mine={team.mine} />
          ))}
        </ol>
      ) : (
        <p className="text-sm">{forfeit ?? "Trận kết thúc"} trước khi xong hiệp nào.</p>
      )}
      {forfeit && match.rounds.length > 0 ? <p className="text-sm text-muted-foreground">{forfeit}: trận kết thúc trước khi đấu hết các hiệp.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((letter) => (
          <TeamMembers key={letter} team={letter} members={team.members[letter]} mine={letter === team.mine} />
        ))}
      </div>
    </DialogContent>
  );
}

function TeamRoundLine({ round, mine }: { round: Round; mine: TeamLetter }) {
  const draw = !round.won && round.mine === round.theirs;
  const winner = round.won ? mine : OTHER_TEAM[mine];
  return (
    <li className={cn("grid gap-0.5 rounded-xl border px-3 py-2", draw ? "" : round.won ? "border-primary/50 bg-primary/10" : "border-arena-rival/40 bg-arena-rival/10")}>
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium">Hiệp {round.round}</span>
        <span className="font-bold tabular-nums">
          {round.mine}–{round.theirs}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">
        {draw ? "Hòa" : `${TEAM_NAME[winner]} thắng`}
        {round.suddenDeath ? " · Có đấu phụ" : ""}
      </span>
    </li>
  );
}

function TeamMembers({ team, members, mine }: { team: TeamLetter; members: ArenaMatchMember[]; mine: boolean }) {
  return (
    <section aria-labelledby={`history-team-${team}`} className={cn("grid content-start gap-2 rounded-xl border p-3", TEAM_TONE[team].border)}>
      <h3 id={`history-team-${team}`} className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>
          <TeamBadge team={team} />
        </span>
        <span className={TEAM_TONE[team].text}>{TEAM_NAME[team]}</span>
        {mine ? <span className="font-normal text-muted-foreground">(đội bạn)</span> : null}
      </h3>
      {members.length > 0 ? (
        <ul className="grid gap-1.5">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2 text-sm">
              <PlayerAvatar player={member} you={team === "A"} className="size-7" />
              <span className="min-w-0 flex-1 truncate">{member.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Không còn ai trong danh sách.</p>
      )}
    </section>
  );
}

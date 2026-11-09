"use client";

import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ArenaMatch } from "@/server/arena/arena.schema";
import { FriendButton } from "@/components/social/friend-button";
import { cn } from "@/lib/utils";
import { forfeitLabel, OpponentAvatar, resultLabel, scoreLabel } from "./match-parts";
import { settingsLine } from "./settings-fields";

type Round = ArenaMatch["rounds"][number];

function roundNote(round: Round): string | null {
  if (round.onTime) return "Hòa điểm, phân thắng bại nhờ trả lời nhanh hơn";
  if (round.suddenDeath) return "Phân thắng bại ở câu quyết định";
  return null;
}

/** One match's rounds (AC-014, AC-015); closing returns focus to its row (AC-016). */
export function MatchDetails({ match, name, when }: { match: ArenaMatch; name: string; when: string }) {
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

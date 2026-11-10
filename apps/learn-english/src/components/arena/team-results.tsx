"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { Handshake, RotateCcw, Trophy } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import type { PublicTeamRoom, Team, TeamRoundResult } from "@/learning/arena/team-protocol";
import { cn } from "@/lib/utils";
import { ARENA_MATCHES_KEY } from "./match-parts";
import { PlayerAvatar } from "./players";
import { TEAM_NAME, TEAM_TONE, TeamBadge, teamOfPlayer, teamPlayer } from "./team-parts";
import type { TeamRoomHandle } from "./use-team-room";

interface TeamResultsProps {
  handle: TeamRoomHandle & { room: PublicTeamRoom };
  me: string;
}

const OTHER: Record<Team, Team> = { A: "B", B: "A" };

/** The learner's own outcome in one line. */
function outcome(room: PublicTeamRoom, mine: Team | null): string | null {
  if (!mine || !room.winner) return null;
  if (room.winner === "draw") return "Hai đội hòa nhau. Trận sau phân thắng bại nhé!";
  return room.winner === mine ? `${TEAM_NAME[mine]} của bạn thắng. Giỏi lắm!` : `${TEAM_NAME[mine]} của bạn thua. Lần sau cố lên nhé!`;
}

function roundNote(round: TeamRoundResult): string | null {
  if (round.winner === null) return "hòa";
  if (round.suddenDeath) return "đấu phụ";
  return null;
}

function RoundLine({ round }: { round: TeamRoundResult }) {
  const note = roundNote(round);
  return (
    <li className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3 py-2", round.winner ? cn(TEAM_TONE[round.winner].border, TEAM_TONE[round.winner].soft) : "")}>
      <span className="font-medium">Hiệp {round.round}</span>
      <span className="flex items-center gap-2 font-bold tabular-nums">
        <TeamBadge team="A" className="size-5" /> {round.scores.A}–{round.scores.B} <TeamBadge team="B" className="size-5" />
      </span>
      {note ? <span className="w-full text-sm text-muted-foreground">{round.winner ? `${TEAM_NAME[round.winner]} thắng ở ${note}` : "Hiệp này hòa"}</span> : null}
    </li>
  );
}

/** One team's players in turn order, each with right answers out of turns (AC-038, AC-041). */
function TeamStats({ room, team, me }: { room: PublicTeamRoom; team: Team; me: string }) {
  const won = room.winner === team;
  return (
    <section aria-labelledby={`result-team-${team}`} className={cn("grid content-start gap-2 rounded-xl border p-3", TEAM_TONE[team].border)}>
      <h3 id={`result-team-${team}`} className="flex items-center gap-2 font-semibold">
        <span aria-hidden>
          <TeamBadge team={team} />
        </span>
        <span className={TEAM_TONE[team].text}>{TEAM_NAME[team]}</span>
        {won ? (
          <>
            <Trophy aria-hidden className="size-4 text-arena-gold" />
            <span className="sr-only">(đội thắng)</span>
          </>
        ) : null}
        <span className="ml-auto text-xs font-normal text-muted-foreground">đúng/lượt</span>
      </h3>
      <ul className="grid gap-1.5">
        {room.teams[team].members.map((id) => {
          const player = teamPlayer(room, id);
          if (!player) return null;
          return (
            <li key={id} className="flex min-h-11 items-center gap-3">
              <PlayerAvatar player={player} you={team === "A"} className="size-8" />
              <span className="min-w-0 flex-1 truncate">
                {player.name}
                {id === me ? <span className="text-muted-foreground"> (bạn)</span> : null}
              </span>
              <span className="font-semibold tabular-nums">
                <span aria-hidden>
                  {player.correct}/{player.answered}
                </span>
                <span className="sr-only">
                  đúng {player.correct} trên {player.answered} lượt
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The end of a team match (AC-038, AC-039, AC-041, AC-051): who won, each round, each player, and play again. */
export function TeamResults({ handle, me }: TeamResultsProps) {
  const { room } = handle;
  const queryClient = useQueryClient();
  // The history now has this match: the hub card and Lịch sử đấu fetch again when next opened (AC-040).
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ARENA_MATCHES_KEY });
  }, [queryClient]);

  const winner = room.winner === "A" || room.winner === "B" ? room.winner : null;
  const mine = teamOfPlayer(room, me);
  const line = outcome(room, mine);
  const isHost = room.hostId === me;

  return (
    <section aria-labelledby="team-match-title" className="mx-auto grid w-full max-w-2xl justify-items-center gap-5 rounded-xl border bg-card px-4 py-8 text-center sm:px-6">
      <Mascot mood={winner && winner === mine ? "cheer" : "think"} size={104} />
      <div className="grid justify-items-center gap-2">
        {winner ? (
          <>
            <Trophy aria-hidden className="size-10 text-arena-gold" />
            <h2 id="team-match-title" className="flex items-center gap-2 text-3xl font-bold">
              <span aria-hidden>
                <TeamBadge team={winner} className="size-8 text-sm" />
              </span>{" "}
              {TEAM_NAME[winner]} thắng!
            </h2>
          </>
        ) : (
          <>
            <Handshake aria-hidden className="size-10 text-muted-foreground" />
            <h2 id="team-match-title" className="text-3xl font-bold">
              Hòa
            </h2>
          </>
        )}
        {winner && room.endReason === "forfeit" ? <p className="text-sm text-muted-foreground">{TEAM_NAME[OTHER[winner]]} rời trận</p> : null}
        {line ? <p className="font-medium">{line}</p> : null}
      </div>

      {room.rounds.length > 0 ? (
        <ol aria-label="Điểm từng hiệp" className="grid w-full max-w-sm gap-2 text-left">
          {room.rounds.map((round) => (
            <RoundLine key={round.round} round={round} />
          ))}
        </ol>
      ) : null}

      <div className="grid w-full gap-3 text-left sm:grid-cols-2">
        <TeamStats room={room} team="A" me={me} />
        <TeamStats room={room} team="B" me={me} />
      </div>

      <div className="grid w-full max-w-xs gap-2">
        {isHost ? (
          <Button size="lg" className="h-12 gap-2 text-base" onClick={handle.again}>
            <RotateCcw aria-hidden /> Chơi lại
          </Button>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Chờ chủ phòng chơi lại…
          </p>
        )}
        <Link href="/arena" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12" })}>
          Về Đấu trường
        </Link>
      </div>
    </section>
  );
}

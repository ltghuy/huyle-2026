"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { RotateCcw, Trophy } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUND_RESULT_MS } from "@/learning/arena/machine";
import type { PublicRoom } from "@/learning/arena/protocol";
import { fetchArenaStats } from "@/lib/arena-client";
import { cn } from "@/lib/utils";
import { ARENA_STATS_KEY } from "./arena-record";
import { Scoreboard } from "./scoreboard";
import { useCountdown } from "./use-countdown";

function nameOf(room: PublicRoom, id: string, me: string): string {
  return id === me ? "Bạn" : (room.players.find((p) => p.id === id)?.name ?? "Đối thủ");
}

/** A round level on points was decided by the tie-break: less time on the questions each won. */
export function wonOnTime(scores: Record<string, number>): boolean {
  const values = Object.values(scores);
  return values.length === 2 && values[0] === values[1];
}

const ON_TIME = "Hòa điểm sau câu quyết định: người trả lời nhanh hơn ở các câu đã ghi điểm thắng hiệp này.";

/** "7–5", yours first. */
function score(scores: Record<string, number>, me: string): string {
  const mine = scores[me] ?? 0;
  const theirs = Object.entries(scores).find(([id]) => id !== me)?.[1] ?? 0;
  return `${mine}–${theirs}`;
}

/** Between rounds, for 5 seconds (AC-020). */
export function RoundResult({ room, me, offset }: { room: PublicRoom; me: string; offset: number }) {
  const last = room.rounds[room.rounds.length - 1];
  const left = Math.ceil(useCountdown(room.deadline, offset) / 1_000);
  if (!last) return null;
  const youWon = last.winnerId === me;
  return (
    <div className="grid gap-4">
      <Scoreboard room={room} me={me} />
      <section aria-labelledby="round-title" className="grid justify-items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <Owl mood={youWon ? "cheer" : "think"} size={88} />
        <h2 id="round-title" className="text-2xl font-bold">
          Hiệp {last.round}: {youWon ? "Bạn thắng" : `${nameOf(room, last.winnerId, me)} thắng`}
        </h2>
        <p className={cn("text-4xl font-bold tabular-nums", youWon ? "text-primary" : "text-arena-rival")}>{score(last.scores, me)}</p>
        {wonOnTime(last.scores) ? <p className="max-w-sm text-sm text-muted-foreground">{ON_TIME}</p> : null}
        <p className="text-sm text-muted-foreground" aria-live="off">
          Hiệp {last.round + 1} bắt đầu sau {left > 0 ? left : Math.ceil(ROUND_RESULT_MS / 1_000)} giây
        </p>
      </section>
    </div>
  );
}

const CONFETTI = Array.from({ length: 12 }, (_, i) => ({ left: `${6 + i * 8}%`, delay: `${(i % 4) * 90}ms`, turn: `${(i % 2 ? -1 : 1) * (120 + i * 25)}deg` }));

/** A one-off burst of accent tiles on a win; none under reduced motion. */
function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible motion-reduce:hidden">
      {CONFETTI.map((piece, i) => (
        <span
          key={i}
          className={cn("absolute top-0 size-2.5 animate-confetti rounded-sm", i % 3 === 0 ? "bg-arena-gold" : i % 3 === 1 ? "bg-primary" : "bg-success")}
          style={{ left: piece.left, animationDelay: piece.delay, ["--confetti-turn" as string]: piece.turn }}
        />
      ))}
    </div>
  );
}

function headline(room: PublicRoom, me: string): string {
  const youWon = room.winnerId === me;
  const rival = room.players.find((p) => p.id !== me);
  if (room.endReason === "forfeit") return youWon ? `${rival?.name ?? "Đối thủ"} đã rời trận, bạn thắng` : "Bạn đã rời trận";
  return youWon ? "Bạn thắng!" : `${rival?.name ?? "Đối thủ"} thắng`;
}

interface MatchResultProps {
  room: PublicRoom;
  me: string;
  onRematch: () => void;
}

/** The end of the match (AC-022, AC-026, AC-027): the winner, each round's score, your record, and play again. */
export function MatchResult({ room, me, onRematch }: MatchResultProps) {
  const stats = useQuery({ queryKey: ARENA_STATS_KEY, queryFn: fetchArenaStats, staleTime: 0, refetchOnMount: "always" });
  const youWon = room.winnerId === me;
  const rival = room.players.find((p) => p.id !== me);
  const youAsked = room.rematch.includes(me);
  const rivalAsked = rival ? room.rematch.includes(rival.id) : false;
  const rivalGone = !rival?.connected;

  return (
    <section aria-labelledby="match-title" className="relative grid justify-items-center gap-4 overflow-hidden rounded-xl border bg-card px-5 py-8 text-center">
      {youWon ? <Confetti /> : null}
      <Owl mood={youWon ? "cheer" : "think"} size={112} />
      <h2 id="match-title" className={cn("text-3xl font-bold", youWon ? "text-primary" : "")}>
        {headline(room, me)}
      </h2>
      {room.rounds.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-2 text-sm">
          {room.rounds.map((round) => (
            <li key={round.round} className={cn("rounded-full border px-3 py-1 tabular-nums", round.winnerId === me ? "border-primary/50 bg-primary/10" : "border-arena-rival/40 bg-arena-rival/10")}>
              Hiệp {round.round} · {score(round.scores, me)}
            </li>
          ))}
        </ul>
      ) : null}
      {room.rounds.some((round) => wonOnTime(round.scores)) ? <p className="max-w-sm text-sm text-muted-foreground">{ON_TIME}</p> : null}
      {stats.data ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Trophy aria-hidden className="size-4 text-primary" />
          Thành tích: {stats.data.wins} thắng · {stats.data.losses} thua
        </p>
      ) : null}

      <div className="grid w-full max-w-xs gap-2">
        <Button size="lg" className="h-12 gap-2 text-base" onClick={onRematch} disabled={youAsked || rivalGone}>
          <RotateCcw aria-hidden />
          {youAsked ? `Đang chờ ${rival?.name ?? "đối thủ"}…` : "Đấu lại"}
        </Button>
        <Link href="/arena" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12" })}>
          Về Đấu trường
        </Link>
        <p className="min-h-5 text-sm text-muted-foreground" role="status">
          {rivalGone ? `${rival?.name ?? "Đối thủ"} đã rời phòng.` : rivalAsked && !youAsked ? `${rival?.name} muốn đấu lại!` : ""}
        </p>
      </div>
    </section>
  );
}

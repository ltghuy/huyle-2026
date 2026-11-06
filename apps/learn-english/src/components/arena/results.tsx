"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, Swords, Trophy } from "lucide-react";
import { Owl } from "@/components/mascot/owl";
import { Button, buttonVariants } from "@/components/ui/button";
import { ROUND_RESULT_MS } from "@/learning/arena/machine";
import type { PublicRoom } from "@/learning/arena/protocol";
import { fetchArenaStats } from "@/lib/arena-client";
import { cn } from "@/lib/utils";
import { ARENA_STATS_KEY } from "./arena-record";
import { PlayerAvatar } from "./players";
import { ARENA_MATCHES_KEY } from "./match-parts";
import { isSpectating, Scoreboard, sides } from "./scoreboard";
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

/** "7–5", the left side first: yours, or the first seat's for a spectator. */
function score(scores: Record<string, number>, leftId: string): string {
  const mine = scores[leftId] ?? 0;
  const theirs = Object.entries(scores).find(([id]) => id !== leftId)?.[1] ?? 0;
  return `${mine}–${theirs}`;
}

/** The id the scores are read from: yours, or the first seat's for a spectator (feature 026). */
function leftId(room: PublicRoom, me: string): string {
  return sides(room, me).left?.id ?? me;
}

/** Between rounds, for 5 seconds (AC-020). */
export function RoundResult({ room, me, offset }: { room: PublicRoom; me: string; offset: number }) {
  const last = room.rounds[room.rounds.length - 1];
  const left = Math.ceil(useCountdown(room.deadline, offset) / 1_000);
  if (!last) return null;
  const youWon = last.winnerId === me;
  const firstSeat = leftId(room, me);
  return (
    <div className="grid gap-4">
      <Scoreboard room={room} me={me} />
      <section aria-labelledby="round-title" className="grid justify-items-center gap-3 rounded-xl border bg-card p-6 text-center">
        <Owl mood={youWon ? "cheer" : "think"} size={88} />
        <h2 id="round-title" className="text-2xl font-bold">
          Hiệp {last.round}: {youWon ? "Bạn thắng" : `${nameOf(room, last.winnerId, me)} thắng`}
        </h2>
        <p className={cn("text-4xl font-bold tabular-nums", last.winnerId === firstSeat ? "text-primary" : "text-arena-rival")}>{score(last.scores, firstSeat)}</p>
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

const CHOOSING = "Chủ phòng đang chọn đối thủ trận sau…";

/** Whether the host can pick the next opponent: the match ended normally and the host is still here (feature 027). */
function hostCanPick(room: PublicRoom): boolean {
  return room.endReason !== "cancelled" && Boolean(room.players.find((p) => p.id === room.creatorId)?.connected);
}

/** The host's choice of who plays next (feature 027, AC-001): the last opponent, if still here, and every spectator. */
function PickOpponent({ room, me, onPick }: { room: PublicRoom; me: string; onPick: (userId: string) => void }) {
  const candidates = [
    ...room.players.filter((p) => p.id !== me && p.connected).map((p) => ({ id: p.id, name: p.name, image: p.image, last: true })),
    ...room.spectators.map((s) => ({ id: s.id, name: s.name, image: null, last: false })),
  ];
  if (candidates.length === 0) return null;
  return (
    <section aria-labelledby="pick-title" className="grid w-full max-w-xs gap-2 text-left">
      <h3 id="pick-title" className="text-sm font-medium text-muted-foreground">
        Chọn đối thủ trận sau
      </h3>
      <ul className="grid gap-2">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <Button variant="outline" className="h-12 w-full justify-start gap-3" onClick={() => onPick(candidate.id)}>
              <PlayerAvatar player={candidate} you={false} className="size-8" />
              <span className="min-w-0 flex-1 truncate text-left">{candidate.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Swords aria-hidden className="size-3.5" /> {candidate.last ? "Đấu lại" : "Đang xem"}
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A spectator's end of the match (feature 026): who won and each round, with no record and no rematch. */
function WatchedResult({ room, me }: { room: PublicRoom; me: string }) {
  const winner = room.players.find((p) => p.id === room.winnerId);
  const loser = room.players.find((p) => p.id !== room.winnerId);
  const left = leftId(room, me);
  const title = room.endReason === "forfeit" ? `${loser?.name ?? "Một người chơi"} đã rời trận, ${winner?.name ?? "người còn lại"} thắng` : `${winner?.name ?? "Người chơi"} thắng!`;
  return (
    <section aria-labelledby="match-title" className="grid justify-items-center gap-4 rounded-xl border bg-card px-5 py-8 text-center">
      <Owl mood="cheer" size={112} />
      <h2 id="match-title" className="text-3xl font-bold">
        {title}
      </h2>
      {room.rounds.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-2 text-sm">
          {room.rounds.map((round) => (
            <li key={round.round} className="rounded-full border px-3 py-1 tabular-nums">
              Hiệp {round.round} · {score(round.scores, left)}
            </li>
          ))}
        </ul>
      ) : null}
      {room.rounds.some((round) => wonOnTime(round.scores)) ? <p className="max-w-sm text-sm text-muted-foreground">{ON_TIME}</p> : null}
      {hostCanPick(room) ? (
        <p role="status" className="text-sm text-muted-foreground">
          {CHOOSING}
        </p>
      ) : null}
      <Link href="/arena" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 w-full max-w-xs" })}>
        Về Đấu trường
      </Link>
    </section>
  );
}

interface MatchResultProps {
  room: PublicRoom;
  me: string;
  onRematch: () => void;
  /** The host picks who plays next (feature 027). */
  onPick: (userId: string) => void;
}

/** The end of the match (AC-022, AC-026, AC-027): the winner, each round's score, and for a player their record and play again. */
export function MatchResult(props: MatchResultProps) {
  return isSpectating(props.room, props.me) ? <WatchedResult room={props.room} me={props.me} /> : <PlayerResult {...props} />;
}

function PlayerResult({ room, me, onRematch, onPick }: MatchResultProps) {
  const stats = useQuery({ queryKey: ARENA_STATS_KEY, queryFn: fetchArenaStats, staleTime: 0, refetchOnMount: "always" });
  const queryClient = useQueryClient();
  // The history now has this match: the hub card and Lịch sử đấu fetch again when next opened (feature 025).
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ARENA_MATCHES_KEY });
  }, [queryClient]);
  const youWon = room.winnerId === me;
  const rival = room.players.find((p) => p.id !== me);
  const youAsked = room.rematch.includes(me);
  const rivalAsked = rival ? room.rematch.includes(rival.id) : false;
  const rivalGone = !rival?.connected;
  // With people watching, the host picks the next opponent instead of the two-way rematch (feature 027).
  const watchers = room.spectators.length > 0 && hostCanPick(room);
  const picking = watchers && room.creatorId === me;
  const hostChoosing = watchers && room.creatorId !== me;

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
        {picking ? (
          <PickOpponent room={room} me={me} onPick={onPick} />
        ) : (
          <Button size="lg" className="h-12 gap-2 text-base" onClick={onRematch} disabled={youAsked || rivalGone}>
            <RotateCcw aria-hidden />
            {youAsked ? `Đang chờ ${rival?.name ?? "đối thủ"}…` : "Đấu lại"}
          </Button>
        )}
        <Link href="/arena" className={buttonVariants({ variant: "outline", size: "lg", className: "h-12" })}>
          Về Đấu trường
        </Link>
        <p className="min-h-5 text-sm text-muted-foreground" role="status">
          {hostChoosing ? CHOOSING : rivalGone ? `${rival?.name ?? "Đối thủ"} đã rời phòng.` : rivalAsked && !youAsked ? `${rival?.name} muốn đấu lại!` : ""}
        </p>
      </div>
    </section>
  );
}

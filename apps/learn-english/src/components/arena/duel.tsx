"use client";

import { useRouter } from "next/navigation";
import { Flag } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { COUNTDOWN_MS, GRACE_MS } from "@/learning/arena/machine";
import type { PublicRoom } from "@/learning/arena/protocol";
import { QUESTION_SECONDS } from "@/learning/arena/questions";
import { cn } from "@/lib/utils";
import { Announcer, QUESTION_LABELS } from "./announcer";
import { AnswerReveal } from "./answer-reveal";
import { CountdownRing } from "./countdown-ring";
import { OpponentStatus } from "./opponent-status";
import { QuestionListen, QuestionRecall, QuestionWrite } from "./question-views";
import { MatchResult, RoundResult } from "./results";
import { isSpectating, Scoreboard } from "./scoreboard";
import { TimerBar } from "./timer-bar";
import { useCountdown } from "./use-countdown";
import type { ArenaRoomHandle } from "./use-arena-room";

type LiveHandle = ArenaRoomHandle & { room: PublicRoom };

interface DuelProps {
  handle: LiveHandle;
  me: string;
}

/** "3, 2, 1" before the first question (AC-008). */
function Countdown({ room, offset }: { room: PublicRoom; offset: number }) {
  const left = useCountdown(room.deadline, offset, 100);
  const number = Math.ceil(left / 1_000);
  return (
    <div className="grid min-h-[50svh] place-items-center text-center">
      <div className="grid gap-2">
        <p className="text-muted-foreground">Trận đấu bắt đầu sau</p>
        <p key={number} className="animate-score-pop text-7xl font-bold text-primary tabular-nums">
          {number > 0 ? number : "Bắt đầu!"}
        </p>
        <p className="sr-only">{`Bắt đầu sau ${Math.ceil(COUNTDOWN_MS / 1_000)} giây`}</p>
      </div>
    </div>
  );
}

/** The match waits for a player who dropped (AC-024). */
function Paused({ room, offset, me }: { room: PublicRoom; offset: number; me: string }) {
  const away = room.players.find((p) => p.id === room.pausedFor);
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-background/85 p-6 text-center backdrop-blur-sm">
      <div className="grid justify-items-center gap-3">
        <CountdownRing deadline={room.deadline} offset={offset} totalMs={GRACE_MS} label="Thời gian chờ" />
        <p className="font-semibold">{room.pausedFor === me ? "Đang kết nối lại…" : `Đang chờ ${away?.name ?? "đối thủ"} kết nối lại…`}</p>
        <p className="max-w-xs text-sm text-muted-foreground">Nếu sau 30 giây vẫn chưa vào lại, người còn ở trong phòng sẽ thắng.</p>
      </div>
    </div>
  );
}

/** Leaving mid-match is a loss, so it asks first. */
function LeaveMatch({ onLeave }: { onLeave: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="h-11 gap-1.5 px-3 text-muted-foreground" />}>
        <Flag aria-hidden className="size-4" /> Rời trận
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời trận bây giờ?</AlertDialogTitle>
          <AlertDialogDescription>Rời trận khi đang đấu sẽ tính là bạn thua trận này.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Đấu tiếp</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onLeave}>
            Rời trận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The open question in its own view, fresh for each question (its input starts empty); read-only for a spectator. */
function QuestionArea({ handle, me }: { handle: LiveHandle; me: string }) {
  const { room } = handle;
  const question = room.question;
  const watching = isSpectating(room, me);
  if (!question) return <div className="min-h-48 rounded-xl border bg-card" aria-hidden />;
  const key = `${room.round}:${room.questionIndex}`;
  const closed = room.phase !== "question";
  const myWrong = handle.wrong?.userId === me ? handle.wrong.count : 0;
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      {question.type === "listen" ? (
        <QuestionListen key={key} question={question} reveal={room.reveal} lockedOut={room.lockedOut.includes(me)} watching={watching} onChoose={handle.choose} />
      ) : question.type === "recall" ? (
        <QuestionRecall key={key} question={question} wrongCount={myWrong} closed={closed} watching={watching} onAnswer={handle.answer} onTyping={handle.typingStarted} />
      ) : (
        <QuestionWrite key={key} question={question} wrongCount={myWrong} closed={closed} watching={watching} onAnswer={handle.answer} onTyping={handle.typingStarted} />
      )}
      {room.phase === "reveal" && room.reveal && room.questionType ? (
        <div className="mt-4">
          <AnswerReveal reveal={room.reveal} questionType={room.questionType} me={me} players={room.players} />
        </div>
      ) : null}
    </div>
  );
}

/** Questions and reveals: scoreboard, time, the question, and what the rival is doing (AC-012, AC-013). */
function Playing({ handle, me }: DuelProps) {
  const router = useRouter();
  const { room } = handle;
  // The rival for a player; both players for a spectator (feature 026).
  const others = room.players.filter((p) => p.id !== me);
  const watching = others.length === room.players.length;
  const suddenDeath = room.suddenDeath > 0;
  const totalMs = room.questionType ? QUESTION_SECONDS[room.questionType] * 1_000 : 0;

  function handleLeave() {
    handle.leave();
    router.push("/arena");
  }

  return (
    <div className="grid gap-4">
      <Scoreboard room={room} me={me} />
      <div className={cn("relative grid gap-3 rounded-xl", suddenDeath && "border-2 border-arena-gold p-3")}>
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="font-medium">
            {suddenDeath ? (
              <span className="rounded-md bg-arena-gold px-2 py-0.5 font-semibold text-foreground dark:text-background">Câu quyết định</span>
            ) : (
              <>
                Câu {room.questionIndex + 1}/{room.questionCount}
              </>
            )}
            {room.questionType ? <span className="text-muted-foreground"> · {QUESTION_LABELS[room.questionType]}</span> : null}
          </p>
          {/* A spectator leaves from the room's header: it costs nobody anything (feature 026). */}
          {watching ? null : <LeaveMatch onLeave={handleLeave} />}
        </div>
        {room.phase === "question" ? <TimerBar deadline={room.deadline} offset={handle.offset} totalMs={totalMs} /> : <div className="h-2.5" aria-hidden />}
        <QuestionArea handle={handle} me={me} />
        {others.map((other) => (
          <OpponentStatus key={other.id} rival={other} typing={handle.typing.includes(other.id)} wrong={handle.wrong} />
        ))}
        {room.phase === "paused" ? <Paused room={room} offset={handle.offset} me={me} /> : null}
      </div>
    </div>
  );
}

/** The match itself (feature 023): countdown, questions, reveals, pauses, and the round and match results. */
export function Duel({ handle, me }: DuelProps) {
  const { room } = handle;
  return (
    <>
      <Announcer room={room} me={me} />
      {room.phase === "countdown" ? (
        <Countdown room={room} offset={handle.offset} />
      ) : room.phase === "question" || room.phase === "reveal" || room.phase === "paused" ? (
        <Playing handle={handle} me={me} />
      ) : room.phase === "round-end" ? (
        <RoundResult room={room} me={me} offset={handle.offset} />
      ) : room.phase === "match-end" ? (
        <MatchResult room={room} me={me} onRematch={handle.rematch} onPick={handle.pickOpponent} />
      ) : null}
    </>
  );
}

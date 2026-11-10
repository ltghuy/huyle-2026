"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flag, Lightbulb, X } from "lucide-react";
import { AudioButton } from "@/components/exercise/audio-button";
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
import { TEAM_COUNTDOWN_MS, TEAM_GRACE_MS, TEAM_ROUND_RESULT_MS } from "@/learning/arena/team-machine";
import { TEAMS, type PublicTeamRoom, type Team } from "@/learning/arena/team-protocol";
import { cn } from "@/lib/utils";
import { QUESTION_LABELS } from "./announcer";
import { CountdownRing } from "./countdown-ring";
import { QuestionListen, QuestionRecall, QuestionWrite } from "./question-views";
import { TEAM_NAME, TEAM_TONE, TeamBadge, teamPlayer } from "./team-parts";
import { TimerBar } from "./timer-bar";
import { useCountdown } from "./use-countdown";
import type { TeamRoomHandle } from "./use-team-room";

// The team match screen ("Đấu đội", feature 039): the round clock and both teams
// at the top, whose turn it is, the shared question card, hints, reveals, pauses
// and round results. The lobby and the final result are other screens.

type LiveHandle = TeamRoomHandle & { room: PublicTeamRoom };

interface TeamMatchProps {
  handle: LiveHandle;
  me: string;
}

/** Sudden-death pairs before a tied round is a draw (AC-037). */
const SUDDEN_PAIRS = 3;

/** "4:05" from milliseconds, rounding up so the clock reads 0:00 only at zero. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1_000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function nameOf(room: PublicTeamRoom, id: string, me: string): string {
  if (id === me) return "Bạn";
  return teamPlayer(room, id)?.name ?? "Người chơi";
}

/** What screen readers hear as the match moves: turns, reveals, pauses and round results. Pure, for tests. */
export function teamAnnouncement(room: PublicTeamRoom, me: string): string {
  switch (room.phase) {
    case "countdown":
      return "Trận đấu sắp bắt đầu.";
    case "question": {
      if (!room.turn) return "";
      const type = room.questionType ? ` ${QUESTION_LABELS[room.questionType]}.` : "";
      if (room.turn.userId === me) return `Đến lượt bạn.${type}`;
      return `Đến lượt ${TEAM_NAME[room.turn.team]}: ${nameOf(room, room.turn.userId, me)}.${type}`;
    }
    case "reveal": {
      if (!room.reveal) return "";
      const who = room.reveal.correct ? `${nameOf(room, room.reveal.by, me)} trả lời đúng.` : "Sai.";
      return `${who} Đáp án: ${room.reveal.answer}.`;
    }
    case "round-end": {
      const last = room.rounds[room.rounds.length - 1];
      if (!last) return "";
      return last.winner ? `${TEAM_NAME[last.winner]} thắng hiệp ${last.round}.` : `Hiệp ${last.round} hòa.`;
    }
    case "paused":
      return room.pausedTeam ? `Trận đấu tạm dừng. Đang chờ ${TEAM_NAME[room.pausedTeam]} kết nối lại.` : "";
    default:
      return "";
  }
}

/** The round's time left: live, frozen while paused, "Hết giờ" at zero, or the sudden-death pair (AC-017, AC-027, AC-028, AC-037). */
function RoundClock({ room, offset }: { room: PublicTeamRoom; offset: number }) {
  const live = useCountdown(room.roundEndsAt, offset, 250);
  if (room.stage === "sudden") {
    return <p className="rounded-md bg-arena-gold px-2 py-0.5 text-sm font-semibold text-foreground dark:text-background">{`Đấu phụ · cặp ${room.suddenPair}/${SUDDEN_PAIRS}`}</p>;
  }
  const frozen = room.phase === "paused" ? room.roundLeftMs : null;
  if (frozen === null && room.roundEndsAt === null) return null;
  const left = frozen ?? live;
  if (left <= 0) {
    const note = room.stage === "extra" && room.turn ? `Câu bù cho ${TEAM_NAME[room.turn.team]}` : "Câu cuối";
    return (
      <p className="grid leading-tight">
        <span className="text-lg font-bold text-destructive">Hết giờ</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </p>
    );
  }
  const clock = formatClock(left);
  return (
    <p role="timer" aria-label={`Hiệp còn ${clock}`} className="text-2xl font-bold tabular-nums">
      <span aria-hidden>{clock}</span>
    </p>
  );
}

/** A team's letter, score, hints and (best of 3) rounds won. */
function TeamChip({ room, team }: { room: PublicTeamRoom; team: Team }) {
  const view = room.teams[team];
  return (
    <div className={cn("flex min-w-0 items-center gap-2 rounded-lg border-2 px-2 py-1.5", TEAM_TONE[team].border, TEAM_TONE[team].soft, team === "B" && "flex-row-reverse")}>
      <TeamBadge team={team} />
      <div className={cn("grid leading-tight", team === "B" && "justify-items-end")}>
        <span className="text-xl font-bold tabular-nums">
          {view.score}
          <span className="sr-only"> điểm</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
          <Lightbulb aria-hidden className="size-3.5" />
          <span aria-hidden>{view.hints}</span>
          <span className="sr-only">{`${view.hints} gợi ý`}</span>
          {room.settings.rounds === 3 ? <span>{` · thắng ${view.roundsWon} hiệp`}</span> : null}
        </span>
      </div>
    </div>
  );
}

/** Sticky at the top: both teams around the round clock and the round number. */
function TopBar({ room, offset }: { room: PublicTeamRoom; offset: number }) {
  return (
    <div className="sticky top-0 z-20 -mx-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b bg-background/95 px-1 py-2 backdrop-blur-sm">
      <TeamChip room={room} team="A" />
      <div className="grid min-w-20 justify-items-center text-center">
        <RoundClock room={room} offset={offset} />
        {room.round > 0 ? (
          <p className="text-xs text-muted-foreground">
            Hiệp {room.round}
            {room.settings.rounds === 3 ? `/${room.settings.rounds}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end">
        <TeamChip room={room} team="B" />
      </div>
    </div>
  );
}

/** "3, 2, 1" before the round's first question. */
function Countdown({ room, offset }: { room: PublicTeamRoom; offset: number }) {
  const left = useCountdown(room.deadline, offset, 100);
  const number = Math.ceil(left / 1_000);
  return (
    <div className="grid min-h-[50svh] place-items-center text-center">
      <div className="grid gap-2">
        <p className="text-muted-foreground">{room.round > 1 ? `Hiệp ${room.round} bắt đầu sau` : "Trận đấu bắt đầu sau"}</p>
        <p key={number} className="animate-score-pop text-7xl font-bold text-primary tabular-nums">
          {number > 0 ? number : "Bắt đầu!"}
        </p>
        <p className="sr-only">{`Bắt đầu sau ${Math.ceil(TEAM_COUNTDOWN_MS / 1_000)} giây`}</p>
      </div>
    </div>
  );
}

/** A whole team dropped: the match waits 30 s for them (AC-045). */
function Paused({ room, offset }: { room: PublicTeamRoom; offset: number }) {
  const team = room.pausedTeam;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-background/85 p-6 text-center backdrop-blur-sm">
      <div className="grid justify-items-center gap-3">
        <CountdownRing deadline={room.deadline} offset={offset} totalMs={TEAM_GRACE_MS} label="Thời gian chờ" />
        <p className="font-semibold">{team ? `Đang chờ ${TEAM_NAME[team]} kết nối lại…` : "Đang chờ kết nối lại…"}</p>
        <p className="max-w-xs text-sm text-muted-foreground">Nếu sau 30 giây đội này vẫn chưa ai vào lại, đội kia sẽ thắng.</p>
      </div>
    </div>
  );
}

/** Leaving takes you out of your team's turns; the match goes on without you. */
function LeaveMatch({ onLeave }: { onLeave: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" className="h-11 gap-1.5 px-3 text-muted-foreground" />}>
        <Flag aria-hidden className="size-4" /> Rời trận
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rời trận bây giờ?</AlertDialogTitle>
          <AlertDialogDescription>Bạn sẽ ra khỏi lượt chơi của đội. Trận đấu vẫn tiếp tục cho đội của bạn.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Ở lại</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onLeave}>
            Rời trận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Whose turn it is, the question's time and the typing dot (AC-020, AC-021). */
function TurnBanner({ handle, me }: TeamMatchProps) {
  const { room } = handle;
  const turn = room.turn;
  if (!turn) return null;
  const mine = turn.userId === me;
  const totalMs = room.settings.seconds * 1_000;
  return (
    <div className={cn("grid gap-2 rounded-xl border border-l-4 bg-card p-3", TEAM_TONE[turn.team].border)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 font-semibold">
          <TeamBadge team={turn.team} />
          <span className="truncate">{mine ? "Lượt của bạn" : `Lượt của ${nameOf(room, turn.userId, me)} · ${TEAM_NAME[turn.team]}`}</span>
        </p>
        <p className="shrink-0 text-sm text-muted-foreground tabular-nums">
          Câu {room.number}
          {room.questionType ? <span className="hidden min-[400px]:inline">{` · ${QUESTION_LABELS[room.questionType]}`}</span> : null}
        </p>
      </div>
      {room.phase === "question" ? <TimerBar deadline={room.deadline} offset={handle.offset} totalMs={totalMs} /> : <div className="h-5" aria-hidden />}
      <p aria-hidden className="flex min-h-5 items-center gap-1.5 text-sm text-muted-foreground">
        {handle.typing && !mine && room.phase === "question" ? (
          <>
            Đang gõ
            <span className="inline-flex gap-0.5">
              <span className="size-1 animate-pulse rounded-full bg-current" />
              <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
              <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}

/** Right or wrong, and the answer, for about 2 s (AC-025). */
function TeamReveal({ room, me }: { room: PublicTeamRoom; me: string }) {
  const reveal = room.reveal;
  if (!reveal) return null;
  const team = room.turn?.team ?? null;
  return (
    <section aria-label="Đáp án" className="grid justify-items-center gap-2 rounded-xl border bg-muted/40 p-4 text-center">
      <p className={cn("flex items-center gap-2 text-lg font-bold", reveal.correct ? "text-success" : "text-destructive")}>
        {reveal.correct ? <Check aria-hidden className="size-5" /> : <X aria-hidden className="size-5" />}
        {reveal.correct ? "Đúng!" : "Sai"}
        {reveal.correct && team ? <span className="animate-score-pop rounded-md bg-success px-1.5 text-sm text-background">{`+1 ${TEAM_NAME[team]}`}</span> : null}
      </p>
      <p className="text-sm text-muted-foreground">{`${nameOf(room, reveal.by, me)}${team ? ` · ${TEAM_NAME[team]}` : ""}`}</p>
      <p className="text-2xl font-semibold text-balance" lang="en">
        <span className="sr-only">Đáp án: </span>
        {reveal.answer}
      </p>
      {reveal.ipa || reveal.audio ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {reveal.ipa ? <span className="ipa">{reveal.ipa}</span> : null}
          {reveal.audio ? <AudioButton audioKey={reveal.audio} source="word" label={reveal.answer} /> : null}
        </div>
      ) : null}
    </section>
  );
}

/** The question card: only the turn player answers; everyone else watches the same card (AC-021). */
function QuestionArea({ handle, me }: TeamMatchProps) {
  const { room } = handle;
  const question = room.question;
  if (!question) return <div className="min-h-48 rounded-xl border bg-card" aria-hidden />;
  const mine = room.turn?.userId === me;
  const watching = !mine;
  // A fresh view per turn: the input starts empty and takes focus on the turn player's device only.
  const key = `${room.round}:${room.stage}:${room.number}:${room.turn?.userId ?? ""}`;
  const closed = room.phase !== "question";
  const myWrong = mine && handle.wrong?.userId === me ? handle.wrong.count : 0;
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      {question.type === "listen" ? (
        <QuestionListen key={key} question={question} reveal={room.reveal} lockedOut={mine && room.lockedOut} watching={watching} onChoose={handle.choose} />
      ) : question.type === "recall" ? (
        <QuestionRecall key={key} question={question} wrongCount={myWrong} closed={closed} watching={watching} hint={room.hint} onAnswer={handle.answer} onTyping={handle.typingStarted} />
      ) : (
        <QuestionWrite key={key} question={question} wrongCount={myWrong} closed={closed} watching={watching} hint={room.hint} onAnswer={handle.answer} onTyping={handle.typingStarted} />
      )}
      {room.phase === "reveal" ? (
        <div className="mt-4">
          <TeamReveal room={room} me={me} />
        </div>
      ) : null}
    </div>
  );
}

/** "Gợi ý (còn 2)" for the turn player on typed questions (AC-032, AC-035). */
function HintButton({ handle, me }: TeamMatchProps) {
  const { room } = handle;
  const turn = room.turn;
  if (!turn || turn.userId !== me || room.phase !== "question" || !room.questionType || room.questionType === "listen") return null;
  const left = room.teams[turn.team].hints;
  // No hints left: not offered (AC-032). Once used on this question it stays, disabled, next to the hint line.
  if (left === 0 && room.hint === null) return null;
  return (
    <Button type="button" variant="outline" className="h-11 gap-2" disabled={room.hint !== null} onClick={handle.hint}>
      <Lightbulb aria-hidden /> Gợi ý (còn {left})
    </Button>
  );
}

const WRONG_FLASH_MS = 1_200;

/** For everyone but the turn player: a short "trả lời sai" after each wrong typed answer (AC-021). */
function WrongFlash({ name, userId, wrong }: { name: string; userId: string; wrong: TeamRoomHandle["wrong"] }) {
  const count = wrong?.userId === userId ? wrong.count : 0;
  // The flash shows until its timer dismisses this wrong answer; a newer one shows again.
  const [dismissed, setDismissed] = useState(0);
  const flashing = count > 0 && count !== dismissed ? count : 0;

  useEffect(() => {
    if (!count) return;
    const timer = setTimeout(() => setDismissed(count), WRONG_FLASH_MS);
    return () => clearTimeout(timer);
  }, [count]);

  if (!flashing) return null;
  return (
    <p key={flashing} className="flex animate-tile-shake items-center gap-1 text-sm font-semibold text-destructive">
      <X aria-hidden className="size-4" /> {name} trả lời sai
    </p>
  );
}

/** Questions, reveals and pauses. */
function Playing({ handle, me }: TeamMatchProps) {
  const router = useRouter();
  const { room } = handle;
  const turnPlayer = room.turn ? teamPlayer(room, room.turn.userId) : undefined;
  const watchingTurn = turnPlayer !== undefined && turnPlayer.id !== me;

  function handleLeave() {
    handle.leave();
    router.push("/arena");
  }

  return (
    <div className="relative grid gap-3 rounded-xl">
      <TurnBanner handle={handle} me={me} />
      <QuestionArea handle={handle} me={me} />
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <HintButton handle={handle} me={me} />
        {watchingTurn ? <WrongFlash name={turnPlayer.name} userId={turnPlayer.id} wrong={handle.wrong} /> : null}
        <div className="ml-auto">
          <LeaveMatch onLeave={handleLeave} />
        </div>
      </div>
      {room.phase === "paused" ? <Paused room={room} offset={handle.offset} /> : null}
    </div>
  );
}

/** "Đội A thắng hiệp 1" or "Hiệp 1 hòa", both scores, and the next round's countdown (AC-029, AC-037). */
function RoundEnd({ room, offset }: { room: PublicTeamRoom; offset: number }) {
  const left = Math.ceil(useCountdown(room.deadline, offset) / 1_000);
  const last = room.rounds[room.rounds.length - 1];
  if (!last) return null;
  return (
    <section aria-labelledby="team-round-title" className="grid justify-items-center gap-3 rounded-xl border bg-card p-6 text-center">
      <h2 id="team-round-title" className={cn("flex items-center gap-2 text-2xl font-bold", last.winner && TEAM_TONE[last.winner].text)}>
        {last.winner ? <TeamBadge team={last.winner} /> : null}
        {last.winner ? `${TEAM_NAME[last.winner]} thắng hiệp ${last.round}` : `Hiệp ${last.round} hòa`}
      </h2>
      <div className="flex items-center gap-3 text-4xl font-bold tabular-nums">
        {TEAMS.map((team, i) => (
          <span key={team} className="flex items-center gap-2">
            {i > 0 ? <span className="text-muted-foreground">–</span> : null}
            {team === "A" ? <TeamBadge team="A" /> : null}
            {last.scores[team]}
            {team === "B" ? <TeamBadge team="B" /> : null}
          </span>
        ))}
      </div>
      {last.suddenDeath ? <p className="text-sm text-muted-foreground">Phân thắng thua bằng đấu phụ</p> : null}
      <p className="text-sm text-muted-foreground" aria-live="off">
        Hiệp sau bắt đầu sau {left > 0 ? left : Math.ceil(TEAM_ROUND_RESULT_MS / 1_000)} giây
      </p>
    </section>
  );
}

/** The team match for every phase between the lobby and the final result (feature 039). */
export function TeamMatch({ handle, me }: TeamMatchProps) {
  const { room } = handle;
  return (
    <div className="grid gap-4">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {teamAnnouncement(room, me)}
      </p>
      <TopBar room={room} offset={handle.offset} />
      {room.phase === "countdown" ? (
        <Countdown room={room} offset={handle.offset} />
      ) : room.phase === "round-end" ? (
        <RoundEnd room={room} offset={handle.offset} />
      ) : room.phase === "question" || room.phase === "reveal" || room.phase === "paused" ? (
        <Playing handle={handle} me={me} />
      ) : null}
    </div>
  );
}

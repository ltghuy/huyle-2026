"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useProfile } from "@/hooks/use-profile";
import { checkBoardName } from "@/learning/leaderboard";
import type { LeaderboardState, Profile } from "@/learning/types";
import { BoardError, declineBoard, joinBoard, submitStreak, type BoardResult } from "@/lib/leaderboard-client";
import { BoardNameField } from "./board-name-field";
import { StreakBoard } from "./streak-board";

type Joined = Extract<LeaderboardState, { status: "joined" }>;
type Stage = { kind: "idle" } | { kind: "board"; result: BoardResult } | { kind: "failed"; message: string };

const FAILED = "Chưa tải được bảng xếp hạng. Điểm của bạn vẫn được lưu, lần sau sẽ cập nhật.";

/**
 * After an awarded daily lesson (feature 007): asks once whether to join the
 * board (AC-007, AC-008), and for learners on it sends the streak and shows
 * where they stand (AC-001, AC-006; 013 AC-010). Never blocks the lesson.
 */
export function BoardAfterLesson() {
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  // Whether the learner had answered when this lesson finished. The profile
  // re-reads after every write, so this is fixed once, on its first read.
  const [answeredAtStart, setAnsweredAtStart] = useState<boolean | null>(null);
  if (ready && answeredAtStart === null) setAnsweredAtStart(ready.leaderboard !== undefined);

  async function showBoard(entry: Joined, owner: Pick<Profile, "timeZone">) {
    try {
      setStage({ kind: "board", result: await submitStreak(entry, owner, Date.now()) });
    } catch (error) {
      setStage({ kind: "failed", message: error instanceof BoardError ? `${error.message} ${FAILED}` : FAILED });
    }
  }

  const joinedAtStart = answeredAtStart && ready?.leaderboard?.status === "joined" ? ready.leaderboard : null;
  const sent = useRef(false);
  useEffect(() => {
    if (!ready || !joinedAtStart || sent.current) return;
    sent.current = true;
    void showBoard(joinedAtStart, ready);
  }, [ready, joinedAtStart]);

  if (!ready) return null;
  if (stage.kind === "failed") return <p className="text-sm text-muted-foreground">{stage.message}</p>;

  return (
    <>
      {answeredAtStart === false ? (
        <BoardConsent initialName={ready.displayName ?? ""} onJoined={(entry) => void showBoard(entry, ready)} />
      ) : null}
      <Dialog open={stage.kind === "board"} onOpenChange={(open) => !open && setStage({ kind: "idle" })}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bảng xếp hạng chuỗi ngày học</DialogTitle>
            <DialogDescription className="sr-only">Vị trí của bạn so với những người học khác, theo số ngày học liên tiếp.</DialogDescription>
          </DialogHeader>
          {stage.kind === "board" ? <StreakBoard result={stage.result} /> : null}
          <DialogFooter>
            <Button size="lg" className="h-11 w-full" onClick={() => setStage({ kind: "idle" })}>
              Tiếp tục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface BoardConsentProps {
  initialName: string;
  onJoined: (entry: Joined) => void;
}

/** The one-time question (AC-007): join under a name of the learner's choice, or not. */
function BoardConsent({ initialName, onJoined }: BoardConsentProps) {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    const checked = checkBoardName(name);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setSaving(true);
    try {
      const entry = await joinBoard(checked.name, Date.now());
      setOpen(false);
      onJoined(entry);
    } catch {
      toast.error("Chưa lưu được lựa chọn. Bạn thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDecline() {
    setOpen(false);
    try {
      await declineBoard(Date.now());
    } catch {
      // Not saved: the question simply comes back after the next lesson.
    }
  }

  function handleNameChange(next: string) {
    setName(next);
    if (error) setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && void handleDecline()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form className="grid gap-4" onSubmit={handleJoin} noValidate>
          <DialogHeader>
            <DialogTitle>Tham gia bảng xếp hạng?</DialogTitle>
            <DialogDescription>
              Bảng xếp theo số ngày học liên tiếp. Tên bạn chọn và chuỗi ngày học của bạn sẽ hiện cho những người học khác. Bạn có thể rời bảng bất cứ lúc nào trong Cài đặt.
            </DialogDescription>
          </DialogHeader>
          <BoardNameField id="board-name" value={name} error={error} onChange={handleNameChange} />
          <DialogFooter className="gap-2 sm:flex-col">
            <Button type="submit" size="lg" className="h-11 w-full" disabled={saving}>
              Tham gia
            </Button>
            <Button type="button" variant="ghost" size="lg" className="h-11 w-full" onClick={() => void handleDecline()}>
              Không, cảm ơn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

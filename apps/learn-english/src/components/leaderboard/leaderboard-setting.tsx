"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/use-profile";
import { checkBoardName } from "@/learning/leaderboard";
import type { LeaderboardState, Profile } from "@/learning/types";
import { BoardError, joinBoard, leaveBoard, renameOnBoard } from "@/lib/leaderboard-client";
import { BoardNameField } from "./board-name-field";

type Joined = Extract<LeaderboardState, { status: "joined" }>;

/** Join or leave the board, and change the name shown on it (feature 007, AC-009, AC-010). */
export function LeaderboardSetting() {
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const entry = ready?.leaderboard?.status === "joined" ? ready.leaderboard : null;
  const [busy, setBusy] = useState(false);

  async function handleChange(checked: boolean) {
    if (!ready) return;
    setBusy(true);
    try {
      if (checked) {
        const name = checkBoardName(ready.displayName ?? "");
        await joinBoard(name.ok ? name.name : "Học viên", Date.now());
        toast.success("Bạn sẽ có tên trên bảng xếp hạng sau bài học hôm nay.");
      } else if (entry) {
        await leaveBoard(entry, Date.now());
        toast.success("Đã xoá bạn khỏi bảng xếp hạng.");
      }
    } catch (error) {
      toast.error(error instanceof BoardError ? error.message : "Chưa lưu được lựa chọn. Bạn thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <Label htmlFor="board-toggle">Hiện tôi trên bảng xếp hạng</Label>
          <p className="text-sm text-muted-foreground">
            Sau mỗi bài học hằng ngày, bạn xem mình đứng thứ mấy theo số ngày học liên tiếp. Tên bạn chọn và chuỗi ngày học của bạn sẽ hiện cho những người học khác. Tắt để xoá bạn khỏi bảng.
          </p>
        </div>
        <Switch id="board-toggle" className="mt-1" checked={entry !== null} disabled={!ready || busy} onCheckedChange={handleChange} />
      </div>
      {entry && ready ? <BoardRename key={entry.name} entry={entry} profile={ready} /> : null}
    </div>
  );
}

function BoardRename({ entry, profile }: { entry: Joined; profile: Pick<Profile, "timeZone"> }) {
  const [name, setName] = useState(entry.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const checked = checkBoardName(name);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    setSaving(true);
    try {
      await renameOnBoard(entry, checked.name, profile, Date.now());
      toast.success("Đã đổi tên trên bảng xếp hạng.");
    } catch (failure) {
      toast.error(failure instanceof BoardError ? failure.message : "Chưa đổi được tên. Bạn thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  function handleNameChange(next: string) {
    setName(next);
    if (error) setError(null);
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
      <BoardNameField id="board-rename" value={name} error={error} onChange={handleNameChange} />
      <div>
        <Button type="submit" variant="outline" size="lg" className="h-11 px-5" disabled={saving || name.trim() === entry.name}>
          Lưu tên
        </Button>
      </div>
    </form>
  );
}

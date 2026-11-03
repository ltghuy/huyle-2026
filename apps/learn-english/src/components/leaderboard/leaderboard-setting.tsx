"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/use-profile";
import { useAccount } from "@/hooks/use-account";
import { learnerName } from "@/lib/learner-name";
import { BoardError, joinBoard, leaveBoard } from "@/lib/leaderboard-client";


/** Join or leave the board (feature 007, AC-009, AC-010); the shown name follows the learner's name (feature 022). */
export function LeaderboardSetting() {
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const entry = ready?.leaderboard?.status === "joined" ? ready.leaderboard : null;
  const [busy, setBusy] = useState(false);
  const { account } = useAccount();
  // What the board shows (feature 022): the chosen name, else the Google name.
  const boardLabel = learnerName(ready?.displayName, account?.name) ?? "Học viên";

  async function handleChange(checked: boolean) {
    if (!ready) return;
    setBusy(true);
    try {
      if (checked) {
        await joinBoard(boardLabel, Date.now());
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
            Sau mỗi bài học hằng ngày, bạn xem mình đứng thứ mấy theo số ngày học liên tiếp. Tên gọi của bạn (hoặc tên Google nếu chưa đặt) và chuỗi ngày học sẽ hiện cho những người học khác. Tắt để xoá bạn khỏi bảng.
          </p>
        </div>
        <Switch id="board-toggle" className="mt-1" checked={entry !== null} disabled={!ready || busy} onCheckedChange={handleChange} />
      </div>
      {entry ? <p className="text-sm text-muted-foreground">Bạn hiện trên bảng với tên {boardLabel}. Đổi tên gọi ở mục “Tên của bạn” phía trên.</p> : null}
    </div>
  );
}

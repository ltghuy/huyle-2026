"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile } from "@/hooks/use-profile";
import { updateProfile } from "@/storage/meta";

/** Opt-out of anonymous usage counts (stored inverted as `statsOptOut`). */
export function StatsToggle() {
  const profile = useProfile();

  async function handleChange(checked: boolean) {
    try {
      await updateProfile({ statsOptOut: !checked }, Date.now());
    } catch {
      toast.error("Chưa lưu được lựa chọn. Bạn thử lại nhé.");
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor="stats-toggle">Gửi thống kê ẩn danh</Label>
        <p className="text-sm text-muted-foreground">
          Chỉ gửi số đếm, như số bài học đã xong hay những từ hay bị sai, không kèm thông tin nào nhận ra bạn. Nhờ vậy ứng dụng được cải thiện đúng chỗ.
        </p>
      </div>
      <Switch
        id="stats-toggle"
        className="mt-1"
        checked={profile.status === "ready" ? !profile.data.statsOptOut : false}
        disabled={profile.status !== "ready"}
        onCheckedChange={handleChange}
      />
    </div>
  );
}

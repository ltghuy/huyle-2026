"use client";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { LEVELS, type Level } from "@/learning/types";
import { updateProfile } from "@/storage/meta";

export const LEVEL_LABELS: Record<Level, string> = {
  A1: "A1 · Mới bắt đầu",
  A2: "A2 · Sơ cấp",
  B1: "B1 · Trung cấp",
  B2: "B2 · Trung cao cấp",
  C1: "C1 · Cao cấp",
};

const isLevel = (value: unknown): value is Level => LEVELS.includes(value as Level);

/** Manual level change; the new level is used for new words from the next lesson (AC-022). */
export function LevelSetting() {
  const profile = useProfile();

  async function handleChange(value: unknown) {
    if (!isLevel(value) || (profile.status === "ready" && profile.data.level === value)) return;
    try {
      await updateProfile({ level: value }, Date.now());
      toast.success(`Đã đổi sang trình độ ${value}. Từ mới theo trình độ này bắt đầu từ bài học tiếp theo.`);
    } catch {
      toast.error("Chưa lưu được trình độ. Bạn thử lại nhé.");
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor="level-select">Trình độ của bạn</Label>
      {profile.status === "ready" ? (
        <Select items={LEVEL_LABELS} value={profile.data.level} onValueChange={handleChange}>
          <SelectTrigger id="level-select" className="h-11 w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {LEVEL_LABELS[level]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Skeleton className="h-11 w-full sm:w-64" />
      )}
      <p className="text-sm text-muted-foreground">Trình độ mới sẽ áp dụng cho từ mới từ bài học tiếp theo. Bài hôm nay giữ nguyên.</p>
    </div>
  );
}

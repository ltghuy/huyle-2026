"use client";

import { useSyncExternalStore } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isSoundEnabled, setSoundEnabled, subscribeSound } from "@/lib/answer-sound";

const serverSnapshot = () => true;

/** Answer sounds on or off, for this device only. */
export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribeSound, isSoundEnabled, serverSnapshot);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid gap-1">
        <Label htmlFor="sound-toggle">Âm thanh khi trả lời</Label>
        <p className="text-sm text-muted-foreground">Phát một tiếng ngắn khi bạn trả lời đúng hoặc sai, và đọc từ khi bạn trả lời đúng. Lựa chọn này chỉ lưu trên thiết bị này.</p>
      </div>
      <Switch id="sound-toggle" className="mt-1" checked={enabled} onCheckedChange={setSoundEnabled} />
    </div>
  );
}

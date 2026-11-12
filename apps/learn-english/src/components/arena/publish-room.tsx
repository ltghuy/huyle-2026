"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublishRoomProps {
  /** The room is listed in "Cộng đồng". */
  isPublic: boolean;
  isHost: boolean;
  /** The lobby has a free seat, so it can be listed (AC-001, AC-003). */
  freeSeat: boolean;
  onPublish: () => void;
  className?: string;
}

/**
 * "Công khai lên Cộng đồng" in a waiting room (feature 041, AC-001, AC-002): the host's button while a
 * seat is free, then a line everyone in the room sees. A public room stays public until the match
 * starts, so there is nothing to undo.
 */
export function PublishRoom({ isPublic, isHost, freeSeat, onPublish, className }: PublishRoomProps) {
  // Pressed, waiting for the room to say it's public: the button can't be pressed twice.
  const [sent, setSent] = useState(false);

  if (!freeSeat) return null;
  if (isPublic) {
    return (
      <p role="status" className={cn("flex items-center justify-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-center text-sm", className)}>
        <Globe aria-hidden className="size-4 shrink-0 text-success" />
        Phòng đang hiện trên Cộng đồng: ai đang tìm trận đều có thể vào.
      </p>
    );
  }
  if (!isHost) return null;

  function handlePublish() {
    setSent(true);
    onPublish();
  }

  return (
    <section aria-labelledby="publish-room-title" className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center", className)}>
      <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Globe className="size-5" />
      </span>
      <div className="grid flex-1 gap-0.5">
        <h2 id="publish-room-title" className="text-sm font-semibold">
          Chưa có ai để đấu?
        </h2>
        <p className="text-sm text-muted-foreground">Công khai phòng để học viên khác thấy trong Cộng đồng và vào ngay, không cần mã. Phòng rời Cộng đồng khi trận bắt đầu.</p>
      </div>
      <Button variant="outline" className="h-11 gap-2" onClick={handlePublish} disabled={sent}>
        <Globe aria-hidden /> Công khai lên Cộng đồng
      </Button>
    </section>
  );
}

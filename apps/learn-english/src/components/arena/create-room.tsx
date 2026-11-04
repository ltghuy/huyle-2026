"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Level } from "@/learning/types";
import { ArenaError, createRoom } from "@/lib/arena-client";
import { roomPath } from "./join-room";
import { SettingsFields, useSettingsDraft } from "./settings-fields";

interface CreateRoomProps {
  /** The learner's level, chosen first. */
  defaultLevel: Level;
  /** The learner's chosen name, shown to the opponent. */
  name?: string;
}

/** "Tạo phòng": mode, level and rounds, then the room (AC-002). */
export function CreateRoom({ defaultLevel, name }: CreateRoomProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const draft = useSettingsDraft({ mode: "mixed", level: defaultLevel, rounds: 3 });
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canCreate = draft.settings !== null && !creating;

  async function handleCreate() {
    if (!draft.settings || !canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const room = await createRoom(draft.settings, name);
      router.push(roomPath(room.code));
    } catch (cause) {
      setError(cause instanceof ArenaError ? cause.message : "Không tạo được phòng. Bạn thử lại nhé.");
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="h-12 w-full gap-2 text-base sm:w-fit" />}>
        <Swords aria-hidden /> Tạo phòng
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo phòng đấu</DialogTitle>
          <DialogDescription>Bạn chọn cách chơi, rồi gửi mã phòng cho bạn bè.</DialogDescription>
        </DialogHeader>

        <SettingsFields draft={draft} onChange={() => setError(null)} />

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button size="lg" className="h-11 w-full gap-2 sm:w-auto" disabled={!canCreate} onClick={handleCreate}>
            <Swords aria-hidden />
            {creating ? "Đang tạo phòng…" : draft.available === null ? "Đang tải câu hỏi…" : "Tạo phòng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

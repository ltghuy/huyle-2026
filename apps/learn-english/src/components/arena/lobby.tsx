"use client";

import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Owl } from "@/components/mascot/owl";
import { READY_MS } from "@/learning/arena/machine";
import { CountdownRing } from "./countdown-ring";
import { InvitePanel } from "./invite-panel";
import { PlayerRow } from "./players";
import { sameSettings, settingsLine } from "./settings-fields";
import type { ArenaRoomHandle } from "./use-arena-room";

interface LobbyProps {
  handle: ArenaRoomHandle & { room: NonNullable<ArenaRoomHandle["room"]> };
  me: string;
}

/** Waiting room: the code to share, both seats, and the 30-second Ready window (AC-003, AC-004, AC-007–AC-010). */
export function Lobby({ handle, me }: LobbyProps) {
  const { room } = handle;
  const you = room.players.find((p) => p.id === me);
  const rival = room.players.find((p) => p.id !== me);
  const isCreator = room.creatorId === me;
  const windowOpen = room.phase === "ready";
  const bothHere = room.players.length === 2;

  // The opponent hears when the creator changes the settings (AC-031); adjusted while rendering, not in an effect.
  const [seen, setSeen] = useState(room.settings);
  const [notice, setNotice] = useState<string | null>(null);
  if (!sameSettings(seen, room.settings)) {
    setSeen(room.settings);
    setNotice(isCreator ? null : `Chủ phòng đã đổi cài đặt: ${settingsLine(room.settings)}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <InvitePanel code={room.code} />

      <p role="status" className={notice ? "rounded-lg bg-primary/10 px-3 py-2 text-center text-sm" : "sr-only"}>
        {notice}
      </p>

      <section aria-labelledby="players-title" className="grid gap-2">
        <h2 id="players-title" className="text-sm font-medium text-muted-foreground">
          Người chơi
        </h2>
        <ul className="grid gap-2">
          {you ? <PlayerRow player={you} you creator={isCreator} showReady={windowOpen} /> : null}
          {rival ? (
            <PlayerRow player={rival} you={false} creator={!isCreator} showReady={windowOpen} />
          ) : (
            <li className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-muted-foreground">
              <Owl mood="think" size={36} />
              <span className="text-sm">Đang chờ đối thủ… Gửi mã hoặc liên kết cho bạn bè nhé.</span>
            </li>
          )}
        </ul>
      </section>

      {windowOpen ? (
        <section aria-label="Sẵn sàng" className="grid justify-items-center gap-3">
          <CountdownRing deadline={room.deadline} offset={handle.offset} totalMs={READY_MS} label="Thời gian sẵn sàng" />
          <Button
            size="lg"
            aria-pressed={Boolean(you?.ready)}
            onClick={handle.ready}
            variant={you?.ready ? "outline" : "default"}
            className="h-14 w-full gap-2 text-lg aria-pressed:border-success aria-pressed:text-success"
          >
            <Check aria-hidden /> {you?.ready ? "Đã sẵn sàng" : "Sẵn sàng"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">Trận đấu bắt đầu khi cả hai bấm Sẵn sàng.</p>
        </section>
      ) : bothHere && isCreator ? (
        <section aria-label="Bắt đầu" className="grid gap-2">
          <p className="text-center text-sm text-muted-foreground">Hết 30 giây mà chưa đủ hai người sẵn sàng.</p>
          <Button size="lg" onClick={handle.start} className="h-14 w-full gap-2 text-lg">
            <Play aria-hidden /> Bắt đầu lại
          </Button>
        </section>
      ) : bothHere ? (
        <p className="text-center text-sm text-muted-foreground">Chờ chủ phòng bắt đầu lại…</p>
      ) : null}
    </div>
  );
}

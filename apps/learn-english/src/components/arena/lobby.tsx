"use client";

import { useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";
import { READY_MS } from "@/learning/arena/machine";
import { ChallengeFriends } from "./challenge-friends";
import { CountdownRing } from "./countdown-ring";
import { InvitePanel } from "./invite-panel";
import { FriendButton } from "@/components/social/friend-button";
import { PlayerRow } from "./players";
import { PublishRoom } from "./publish-room";
import { isSpectating } from "./scoreboard";
import { sameSettings, settingsLine } from "./settings-fields";
import type { ArenaRoomHandle } from "./use-arena-room";

interface LobbyProps {
  handle: ArenaRoomHandle & { room: NonNullable<ArenaRoomHandle["room"]> };
  me: string;
}

/** A spectator's lobby (feature 026): both seats and their Ready marks, nothing to press. */
function WatchingLobby({ room }: { room: LobbyProps["handle"]["room"] }) {
  const waiting = room.phase === "ready" ? "Đang chờ hai người chơi bấm Sẵn sàng…" : room.players.length < 2 ? "Đang chờ người chơi thứ hai…" : "Đang chờ chủ phòng bắt đầu…";
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <section aria-labelledby="players-title" className="grid gap-2">
        <h2 id="players-title" className="text-sm font-medium text-muted-foreground">
          Người chơi
        </h2>
        <ul className="grid gap-2">
          {room.players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              you={false}
              creator={player.id === room.creatorId}
              showReady={room.phase === "ready"}
              otherLabel="Người chơi"
              action={<FriendButton userId={player.id} />}
            />
          ))}
        </ul>
      </section>
      <p role="status" className="text-center text-sm text-muted-foreground">
        {waiting}
      </p>
    </div>
  );
}

/** Waiting room: the code to share, both seats, and the 30-second Ready window (AC-003, AC-004, AC-007–AC-010). */
export function Lobby({ handle, me }: LobbyProps) {
  if (isSpectating(handle.room, me)) return <WatchingLobby room={handle.room} />;
  return <PlayerLobby handle={handle} me={me} />;
}

function PlayerLobby({ handle, me }: LobbyProps) {
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
            <PlayerRow player={rival} you={false} creator={!isCreator} showReady={windowOpen} action={<FriendButton userId={rival.id} />} />
          ) : (
            <li className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed px-3 py-2 text-muted-foreground">
              <Mascot mood="think" size={36} />
              <span className="text-sm">Đang chờ đối thủ… Gửi mã hoặc liên kết cho bạn bè nhé.</span>
            </li>
          )}
        </ul>
      </section>

      {/* While the seat is free, the host can challenge an online friend (feature 035) or list the room in "Cộng đồng" (feature 041). */}
      {isCreator && !rival && room.phase === "lobby" ? (
        <ChallengeFriends code={room.code} hostName={you?.name} inRoom={[...room.players.map((p) => p.id), ...room.spectators.map((s) => s.id)]} />
      ) : null}
      <PublishRoom isPublic={room.public} isHost={isCreator} freeSeat={!rival && room.phase === "lobby"} onPublish={handle.publish} />

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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import type { TeamSettings } from "@/learning/arena/team-protocol";
import { link } from "@/lib/link-client";
import { TeamEditSettings } from "./team-edit-settings";
import { TeamLobby } from "./team-lobby";
import { TeamMatch } from "./team-match";
import { TeamResults } from "./team-results";
import { teamSettingsLine } from "./team-settings-fields";
import { useTeamRoom } from "./use-team-room";

const BACK = "/arena";

function Message({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mx-auto grid max-w-sm justify-items-center gap-3 py-16 text-center">
      <Mascot mood="think" size={96} />
      <h1 className="text-xl font-semibold">{title}</h1>
      {text ? <p className="text-muted-foreground">{text}</p> : null}
      <Link href={BACK} className={buttonVariants({ variant: "outline", className: "h-11" })}>
        Về Đấu trường
      </Link>
    </div>
  );
}

function sameSettings(a: TeamSettings, b: TeamSettings): boolean {
  return a.mode === b.mode && a.level === b.level && a.rounds === b.rounds && a.seconds === b.seconds && a.size === b.size && a.minutes === b.minutes;
}

interface LiveTeamRoomProps {
  code: string;
  me: string;
  ticket: string;
  refreshTicket: () => Promise<string>;
}

/** A team room ("Đấu đội", feature 039): the socket, then the lobby, the match or the result. */
export function LiveTeamRoom({ code, me, ticket, refreshTicket }: LiveTeamRoomProps) {
  const router = useRouter();
  const handle = useTeamRoom(code, ticket, { refreshTicket });
  const room = handle.room;

  // While this room is open, friends' challenges find the learner busy (feature 035, AC-007).
  const inRoom = room !== null && handle.status !== "closed";
  useEffect(() => {
    if (!inRoom) return;
    link.setRoom(code);
    return () => link.setRoom(null);
  }, [inRoom, code]);

  // Everyone but the host hears when the host changes the settings in the lobby (AC-049); adjusted while rendering, not in an effect.
  const [seen, setSeen] = useState<TeamSettings | null>(room?.settings ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  if (room && (seen === null || !sameSettings(seen, room.settings))) {
    setSeen(room.settings);
    setNotice(seen !== null && room.hostId !== me && room.phase === "lobby" ? `Chủ phòng đã đổi cài đặt: ${teamSettingsLine(room.settings)}` : null);
  } else if (room && room.phase !== "lobby" && notice !== null) {
    // The notice is about this lobby only; it doesn't come back after "Chơi lại".
    setNotice(null);
  }

  function handleLeave() {
    handle.leave();
    router.push(BACK);
  }

  if (room?.phase === "closed" || (handle.status === "closed" && room?.phase !== "match-end")) {
    return <Message title={handle.error ?? "Phòng đã đóng."} />;
  }
  if (!room) {
    return (
      <div className="grid justify-items-center gap-3 py-24 text-muted-foreground" role="status">
        <Loader2 aria-hidden className="size-6 animate-spin" />
        Đang vào phòng {code}…
      </div>
    );
  }

  const inLobby = room.phase === "lobby";
  const live = { ...handle, room };
  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between gap-3">
        {inLobby ? (
          <Button variant="ghost" className="h-11 gap-2 px-2" onClick={handleLeave}>
            <ArrowLeft aria-hidden /> Rời phòng
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">{teamSettingsLine(room.settings)}</p>
          {inLobby && room.hostId === me ? <TeamEditSettings settings={room.settings} minSize={room.players.length} onSave={handle.changeSettings} /> : null}
        </div>
      </header>
      {inLobby ? (
        <p role="status" className={notice ? "rounded-lg bg-primary/10 px-3 py-2 text-center text-sm" : "sr-only"}>
          {notice}
        </p>
      ) : null}
      {handle.status === "reconnecting" ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-center text-sm">
          Đang kết nối lại…
        </p>
      ) : null}
      {inLobby ? <TeamLobby handle={live} me={me} /> : room.phase === "match-end" ? <TeamResults handle={live} me={me} /> : <TeamMatch handle={live} me={me} />}
    </div>
  );
}

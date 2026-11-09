"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { SignInGate } from "@/components/account/sign-in-gate";
import { Mascot } from "@/components/mascot/mascot";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { CODE_PATTERN } from "@/learning/arena/protocol";
import { ArenaError, joinRoom } from "@/lib/arena-client";
import { learnerName } from "@/lib/learner-name";
import { link } from "@/lib/link-client";
import { Duel } from "./duel";
import { EditSettings } from "./edit-settings";
import { Lobby } from "./lobby";
import { isSpectating } from "./scoreboard";
import { settingsLine } from "./settings-fields";
import { useArenaRoom } from "./use-arena-room";

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

/** The live room for a signed-in player: a fresh ticket, the socket, then the lobby or the duel. */
function LiveRoom({ code, me, name }: { code: string; me: string; name?: string }) {
  const router = useRouter();
  // A ticket lasts 60 s and is only ever kept in memory: fetched here, again on every reconnect.
  const ticket = useQuery({ queryKey: ["arena-ticket", code, me], queryFn: () => joinRoom(code, name), retry: false, staleTime: Infinity, gcTime: 0 });
  const refreshTicket = useCallback(() => joinRoom(code, name).then((fresh) => fresh.ticket), [code, name]);
  const handle = useArenaRoom(code, ticket.data?.ticket ?? null, { refreshTicket });
  // While this room is open, friends' challenges find the learner busy (feature 035, AC-007).
  const inRoom = handle.room !== null && handle.status !== "closed";
  useEffect(() => {
    if (!inRoom) return;
    link.setRoom(code);
    return () => link.setRoom(null);
  }, [inRoom, code]);

  function handleLeave() {
    handle.leave();
    router.push(BACK);
  }

  if (ticket.isError) {
    const message = ticket.error instanceof ArenaError ? ticket.error.message : "Không vào được phòng. Bạn thử lại nhé.";
    return <Message title="Không vào được phòng" text={message} />;
  }
  if (handle.status === "closed" && !handle.room?.winnerId) return <Message title={handle.error ?? "Phòng đã đóng."} />;
  const room = handle.room;
  if (!room) {
    return (
      <div className="grid justify-items-center gap-3 py-24 text-muted-foreground" role="status">
        <Loader2 aria-hidden className="size-6 animate-spin" />
        Đang vào phòng {code}…
      </div>
    );
  }

  const inLobby = room.phase === "lobby" || room.phase === "ready";
  // Spectators may leave from any phase; players only from the lobby (mid-match, leaving is a forfeit with its own dialog).
  const watching = isSpectating(room, me);
  const watchers = room.spectators.length;
  return (
    <div className="grid gap-6">
      <header className="flex items-center justify-between gap-3">
        {inLobby || watching ? (
          <Button variant="ghost" className="h-11 gap-2 px-2" onClick={handleLeave}>
            <ArrowLeft aria-hidden /> Rời phòng
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <p className="text-sm text-muted-foreground">{settingsLine(room.settings)}</p>
          {watchers > 0 ? (
            <p className="flex items-center gap-1 text-sm text-muted-foreground" title={room.spectators.map((s) => s.name).join(", ")}>
              <Eye aria-hidden className="size-4" /> {watchers} người đang xem
            </p>
          ) : null}
          {inLobby && room.creatorId === me ? <EditSettings settings={room.settings} onSave={handle.changeSettings} /> : null}
        </div>
      </header>
      {watching ? (
        <p role="status" className="rounded-lg bg-primary/10 px-3 py-2 text-center text-sm">
          Bạn đang xem trận đấu
        </p>
      ) : null}
      {handle.status === "reconnecting" ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-center text-sm">
          Đang kết nối lại…
        </p>
      ) : null}
      {inLobby ? <Lobby handle={{ ...handle, room }} me={me} /> : <Duel handle={{ ...handle, room }} me={me} />}
    </div>
  );
}

/** `/arena/room?code=`: guests sign in and come back to the same room (AC-006). */
export function RoomScreen() {
  const code = (useSearchParams().get("code") ?? "").toUpperCase();
  const { account } = useAccount();
  const profile = useProfile();
  const name = learnerName(profile.status === "ready" ? profile.data.displayName : undefined, account?.name);

  if (!CODE_PATTERN.test(code)) return <Message title="Mã phòng không hợp lệ" text="Mã phòng có 6 ký tự. Bạn kiểm tra lại liên kết nhé." />;
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-8">
      <SignInGate area="arena" mascot className="py-12">
        {account ? <LiveRoom code={code} me={account.userId} name={name} /> : null}
      </SignInGate>
    </main>
  );
}

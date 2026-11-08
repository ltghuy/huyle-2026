import type { ReactNode } from "react";
import { CheckCircle2, Crown, Hourglass, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicPlayer } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** A player's avatar ringed in their side's colour: you in the accent, the rival in `--arena-rival`. */
export function PlayerAvatar({ player, you, className }: { player: Pick<PublicPlayer, "name" | "image">; you: boolean; className?: string }) {
  return (
    <Avatar className={cn("size-10 ring-2 ring-offset-2 ring-offset-background", you ? "ring-primary" : "ring-arena-rival", className)}>
      {player.image ? <AvatarImage src={player.image} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback className={cn("font-semibold", you ? "bg-primary/15 text-primary" : "bg-arena-rival/15 text-arena-rival")}>{initials(player.name)}</AvatarFallback>
    </Avatar>
  );
}

interface PlayerRowProps {
  player: PublicPlayer;
  you: boolean;
  creator: boolean;
  /** Show the Ready mark (the Ready window is open). */
  showReady: boolean;
  /** What the seat is called when it isn't yours: "Đối thủ", or "Người chơi" for a spectator (feature 026). */
  otherLabel?: string;
  /** Shown at the row's end, before the status: the friend button (feature 031). */
  action?: ReactNode;
}

/** One seat in the lobby: avatar, name, "Bạn" / "Chủ phòng", and whether they're ready or away. */
export function PlayerRow({ player, you, creator, showReady, otherLabel = "Đối thủ", action }: PlayerRowProps) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-3 py-2">
      <PlayerAvatar player={player} you={you} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{player.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {you ? "Bạn" : otherLabel}
          {creator ? (
            <>
              <span aria-hidden>·</span>
              <Crown aria-hidden className="size-3" /> Chủ phòng
            </>
          ) : null}
        </p>
      </div>
      {action}
      {!player.connected ? (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <WifiOff aria-hidden className="size-4" /> Mất kết nối
        </span>
      ) : showReady && player.ready ? (
        <span className="flex items-center gap-1 text-sm font-semibold text-success">
          <CheckCircle2 aria-hidden className="size-4" /> Sẵn sàng
        </span>
      ) : showReady ? (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Hourglass aria-hidden className="size-4" /> Đang chờ
        </span>
      ) : null}
    </li>
  );
}

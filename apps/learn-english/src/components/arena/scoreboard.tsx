import type { PublicPlayer, PublicRoom } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./players";

/** Rounds a player needs: 1 of 1, or 2 of 3. */
export function roundsToWin(room: Pick<PublicRoom, "settings">): number {
  return Math.floor(room.settings.rounds / 2) + 1;
}

function RoundPips({ won, needed, you }: { won: number; needed: number; you: boolean }) {
  if (needed <= 1) return null;
  return (
    <span aria-hidden className={cn("flex gap-1", you ? "" : "flex-row-reverse")}>
      {Array.from({ length: needed }, (_, i) => (
        // A won pip is gold with a darker edge: gold alone is too faint on white (design, contrast).
        <span key={i} className={cn("size-2.5 rounded-full border", i < won ? "border-streak bg-arena-gold dark:border-arena-gold" : "border-border bg-muted")} />
      ))}
    </span>
  );
}

function Side({ player, you, needed, scored }: { player: PublicPlayer; you: boolean; needed: number; scored: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", you ? "" : "flex-row-reverse text-right")}>
      <PlayerAvatar player={player} you={you} className="size-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{you ? "Bạn" : player.name}</p>
        <RoundPips won={player.roundsWon} needed={needed} you={you} />
      </div>
      <span
        key={scored ? `${player.score}` : undefined}
        className={cn("ml-auto text-3xl font-bold tabular-nums", you ? "text-primary" : "mr-auto ml-0 text-arena-rival", scored && "animate-score-pop")}
      >
        {player.score}
      </span>
    </div>
  );
}

/**
 * You on the left in your accent, the rival on the right in theirs: name, this round's points and the
 * rounds won (pips, and in words for screen readers). Never colour alone: "Bạn" and the name label each side.
 */
export function Scoreboard({ room, me }: { room: PublicRoom; me: string }) {
  const you = room.players.find((p) => p.id === me);
  const rival = room.players.find((p) => p.id !== me);
  if (!you || !rival) return null;
  const needed = roundsToWin(room);
  const lastScorer = room.reveal?.answeredBy ?? null;
  return (
    <section aria-label="Tỉ số" className="rounded-xl border bg-card px-3 py-2.5">
      <p className="sr-only">
        Hiệp {room.round}. Bạn {you.score} điểm, {rival.name} {rival.score} điểm.
        {needed > 1 ? ` Hiệp thắng: bạn ${you.roundsWon}, ${rival.name} ${rival.roundsWon}.` : ""}
      </p>
      <div aria-hidden className="flex items-center gap-3">
        <Side player={you} you needed={needed} scored={lastScorer === you.id} />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{room.settings.rounds > 1 ? `Hiệp ${room.round}` : "vs"}</span>
        <Side player={rival} you={false} needed={needed} scored={lastScorer === rival.id} />
      </div>
    </section>
  );
}

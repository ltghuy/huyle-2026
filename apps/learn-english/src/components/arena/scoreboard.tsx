import type { PublicPlayer, PublicRoom } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "./players";

/** Rounds a player needs: 1 of 1, or 2 of 3. */
export function roundsToWin(room: Pick<PublicRoom, "settings">): number {
  return Math.floor(room.settings.rounds / 2) + 1;
}

/** Whether the viewer is watching rather than playing (feature 026). */
export function isSpectating(room: Pick<PublicRoom, "players">, me: string): boolean {
  return !room.players.some((p) => p.id === me);
}

/**
 * The scoreboard's two sides: you on the left when you play; for a spectator, the creator (first seat) on the
 * left and the other player on the right (feature 026).
 */
export function sides(room: Pick<PublicRoom, "players">, me: string): { left: PublicPlayer | undefined; right: PublicPlayer | undefined } {
  const left = room.players.find((p) => p.id === me) ?? room.players[0];
  return { left, right: room.players.find((p) => p !== left) };
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

/** One side of the board; `you` labels it "Bạn". The left side (yours, or the first seat for a spectator) wears the accent. */
function Side({ player, you, start = you, needed, scored }: { player: PublicPlayer; you: boolean; start?: boolean; needed: number; scored: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2.5", start ? "" : "flex-row-reverse text-right")}>
      <PlayerAvatar player={player} you={start} className="size-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{you ? "Bạn" : player.name}</p>
        <RoundPips won={player.roundsWon} needed={needed} you={start} />
      </div>
      <span
        key={scored ? `${player.score}` : undefined}
        className={cn("ml-auto text-3xl font-bold tabular-nums", start ? "text-primary" : "mr-auto ml-0 text-arena-rival", scored && "animate-score-pop")}
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
  const { left, right: rival } = sides(room, me);
  if (!left || !rival) return null;
  const you = left.id === me;
  const leftName = you ? "Bạn" : left.name;
  const needed = roundsToWin(room);
  const lastScorer = room.reveal?.answeredBy ?? null;
  return (
    <section aria-label="Tỉ số" className="rounded-xl border bg-card px-3 py-2.5">
      <p className="sr-only">
        Hiệp {room.round}. {leftName} {left.score} điểm, {rival.name} {rival.score} điểm.
        {needed > 1 ? ` Hiệp thắng: ${you ? "bạn" : left.name} ${left.roundsWon}, ${rival.name} ${rival.roundsWon}.` : ""}
      </p>
      <div aria-hidden className="flex items-center gap-3">
        <Side player={left} you={you} start needed={needed} scored={lastScorer === left.id} />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">{room.settings.rounds > 1 ? `Hiệp ${room.round}` : "vs"}</span>
        <Side player={rival} you={false} needed={needed} scored={lastScorer === rival.id} />
      </div>
    </section>
  );
}

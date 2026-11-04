"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PublicPlayer } from "@/learning/arena/protocol";

const FLASH_MS = 1_200;

interface OpponentStatusProps {
  rival: PublicPlayer;
  typing: boolean;
  /** The last wrong answer of anyone: a new `count` from the rival flashes "sai". */
  wrong: { userId: string; count: number } | null;
}

/** What the rival is doing, never what they typed (AC-013): "đang gõ…", or a short "sai" after a wrong answer. */
export function OpponentStatus({ rival, typing, wrong }: OpponentStatusProps) {
  const rivalWrong = wrong?.userId === rival.id ? wrong.count : 0;
  // The flash shows until its timer dismisses this wrong answer; a newer one shows again.
  const [dismissed, setDismissed] = useState(0);
  const flashing = rivalWrong > 0 && rivalWrong !== dismissed ? rivalWrong : 0;

  useEffect(() => {
    if (!rivalWrong) return;
    const timer = setTimeout(() => setDismissed(rivalWrong), FLASH_MS);
    return () => clearTimeout(timer);
  }, [rivalWrong]);

  return (
    <p aria-hidden className="flex min-h-6 items-center gap-1.5 text-sm text-muted-foreground">
      {flashing ? (
        <span key={flashing} className="flex animate-tile-shake items-center gap-1 font-semibold text-destructive">
          <X className="size-4" /> {rival.name} trả lời sai
        </span>
      ) : typing ? (
        <>
          <span className="font-medium text-arena-rival">{rival.name}</span> đang gõ
          <span className="inline-flex gap-0.5" aria-hidden>
            <span className="size-1 animate-pulse rounded-full bg-current" />
            <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
            <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
          </span>
        </>
      ) : null}
    </p>
  );
}

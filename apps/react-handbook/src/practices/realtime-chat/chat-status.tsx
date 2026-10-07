"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { TypingEntry } from "./chat-store";
import type { ConnectionInfo } from "./connection";

const LABELS = {
  connecting: "Connecting…",
  live: "Live",
  reconnecting: "Reconnecting…",
  offline: "Offline",
} as const;

const DOTS = {
  connecting: "bg-warning",
  live: "bg-success",
  reconnecting: "bg-warning",
  offline: "bg-destructive",
} as const;

/** Re-renders every second while a retry countdown is running. */
function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until === null ? null : Math.max(0, Math.ceil((until - now) / 1000));
}

export function ConnectionBadge({ info }: { info: ConnectionInfo }) {
  const seconds = useCountdown(info.retryAt);
  const label =
    info.status === "reconnecting" && seconds !== null && seconds > 0
      ? `Reconnecting in ${seconds}s…`
      : LABELS[info.status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium">
      <span aria-hidden className={cn("size-2 rounded-full", DOTS[info.status])} />
      {label}
      {/* Announce status changes, not every countdown tick. */}
      <span role="status" className="sr-only">
        {`Connection: ${LABELS[info.status]}`}
      </span>
    </span>
  );
}

export function TypingLine({ typing }: { typing: TypingEntry[] }) {
  let text = "";
  if (typing.length === 1) text = `${typing[0].authorName} is typing…`;
  else if (typing.length === 2) text = `${typing[0].authorName} and ${typing[1].authorName} are typing…`;
  else if (typing.length > 2) text = "Several people are typing…";

  // Fixed height, so the list above never shifts when it appears.
  return <p className="h-5 truncate px-1 text-xs text-foreground/75 italic">{text}</p>;
}

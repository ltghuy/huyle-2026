"use client";

import { Cloud, CloudOff, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { dismissDraftNotice, useDraftStatus } from "./draft";

const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function savedLabel(savedAt: string, now: number) {
  const minutes = Math.floor((now - Date.parse(savedAt)) / 60_000);
  if (minutes < 1) return "Saved just now";
  if (minutes < 60) return `Saved ${minutes} min ago`;
  return `Saved at ${time.format(new Date(savedAt))}`;
}

/** Re-renders every 30 s so "N min ago" stays true. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function DraftStatus({ onStartOver }: { onStartOver: () => void }) {
  const status = useDraftStatus();
  const now = useNow();
  const notice = status.restored ?? (status.discarded ? { savedAt: null, notice: status.discarded } : null);

  return (
    <div className="flex flex-col gap-3">
      {notice ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {notice.savedAt ? <p className="font-medium">Draft restored from {time.format(new Date(notice.savedAt))}.</p> : null}
            {notice.notice ? <p className={notice.savedAt ? "text-muted-foreground" : "font-medium"}>{notice.notice}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={dismissDraftNotice}>
            <X aria-hidden />
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5">
          {status.blocked ? (
            <>
              <CloudOff aria-hidden className="size-4" /> Not saved: storage is blocked
            </>
          ) : status.savedAt ? (
            <>
              <Cloud aria-hidden className="size-4" /> {savedLabel(status.savedAt, now)}
            </>
          ) : (
            <>
              <Cloud aria-hidden className="size-4" /> Your answers are saved in this browser as you type
            </>
          )}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
          <RotateCcw aria-hidden /> Start over
        </Button>
      </div>
    </div>
  );
}

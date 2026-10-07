"use client";

import { Check, CheckCheck, Clock, RotateCcw, TriangleAlert, X } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { chat, type LocalMessage } from "./chat-store";

const TIME = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export function formatTime(iso: string) {
  return TIME.format(new Date(iso));
}

export const MessageRow = memo(function MessageRow({
  message,
  showHeader,
  seen,
}: {
  message: LocalMessage;
  /** First message of a group: show author and time above the bubble. */
  showHeader: boolean;
  seen: boolean;
}) {
  const { own, state } = message;
  const time = formatTime(message.createdAt);

  return (
    <div className={cn("flex flex-col gap-1", own ? "items-end" : "items-start", showHeader && "mt-3")}>
      {showHeader ? (
        <p className="flex items-baseline gap-2 px-1 text-xs">
          <span className="font-medium text-foreground">{own ? "You" : message.authorName}</span>
          <time dateTime={message.createdAt} className="text-foreground/75 tabular-nums">
            {time}
          </time>
        </p>
      ) : null}
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap wrap-anywhere sm:max-w-[80%]",
          own ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
          state === "sending" && "opacity-70",
          state === "failed" && "border-2 border-destructive bg-background text-foreground",
        )}
      >
        {/* Header-less bubbles still carry the author for screen readers. */}
        {showHeader ? null : <span className="sr-only">{own ? "You" : message.authorName}, {time}: </span>}
        {message.text}
      </div>
      {own ? <Delivery message={message} seen={seen} /> : null}
    </div>
  );
});

function Delivery({ message, seen }: { message: LocalMessage; seen: boolean }) {
  if (message.state === "sending") {
    return (
      <p className="flex items-center gap-1 px-1 text-xs text-foreground/75">
        <Clock aria-hidden className="size-3" /> Sending…
      </p>
    );
  }
  if (message.state === "failed") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 px-1 text-xs">
        <span className="flex items-center gap-1 text-destructive">
          <TriangleAlert aria-hidden className="size-3.5" />
          Not sent{message.error ? `: ${message.error}` : ""}
        </span>
        <Button variant="outline" size="sm" className="h-9 sm:h-7" onClick={() => chat.retry(message.clientId)}>
          <RotateCcw aria-hidden /> Retry
        </Button>
        <Button variant="ghost" size="sm" className="h-9 sm:h-7" onClick={() => chat.discard(message.clientId)}>
          <X aria-hidden /> Discard
        </Button>
      </div>
    );
  }
  return (
    <p className="flex items-center gap-1 px-1 text-xs text-foreground/75">
      {seen ? <CheckCheck aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
      {seen ? "Seen" : "Delivered"}
    </p>
  );
}

"use client";

import { SendHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_TEXT } from "@/server/practices/realtime-chat/chat.schema";

import { chat } from "./chat-store";

/** Show the counter once the message gets this close to the limit. */
const COUNTER_FROM = MAX_TEXT - 200;

export function Composer({ onSent }: { onSent: () => void }) {
  const [text, setText] = useState("");
  const ids = { input: useId(), counter: useId() };
  const length = text.trim().length;
  const tooLong = length > MAX_TEXT;
  const canSend = length > 0 && !tooLong;

  function submit() {
    if (!canSend || !chat.send(text)) return;
    setText("");
    onSent();
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    chat.notifyTyping(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter (or Enter while composing IME text) adds a line.
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    submit();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <label htmlFor={ids.input} className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id={ids.input}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={chat.stopTyping}
          rows={1}
          placeholder="Write a message…"
          aria-invalid={tooLong || undefined}
          aria-describedby={ids.counter}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={!canSend} aria-label="Send message" className="size-10">
          <SendHorizontal aria-hidden />
        </Button>
      </div>
      <p
        id={ids.counter}
        className={cn(
          "px-1 text-xs",
          tooLong ? "text-destructive" : "text-foreground/75",
          length < COUNTER_FROM && "sr-only",
        )}
      >
        {tooLong
          ? `${length - MAX_TEXT} ${length - MAX_TEXT === 1 ? "character" : "characters"} over the ${MAX_TEXT} limit`
          : `${MAX_TEXT - length} characters left. Enter to send, Shift+Enter for a new line.`}
      </p>
    </form>
  );
}

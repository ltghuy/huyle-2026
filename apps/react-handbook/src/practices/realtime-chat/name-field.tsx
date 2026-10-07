"use client";

import { Pencil } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { chat } from "./chat-store";

export function NameField({ name }: { name: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ids = { input: useId(), error: useId() };

  function startEditing() {
    setDraft(name);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = chat.rename(draft ?? "");
    setError(message);
    if (!message) setDraft(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setDraft(null);
  }

  if (draft === null) {
    return (
      <p className="flex items-center gap-1 text-sm">
        <span className="text-foreground/75">You are</span>
        <span className="font-medium">{name}</span>
        <Button variant="ghost" size="icon-sm" aria-label="Change your display name" onClick={startEditing}>
          <Pencil aria-hidden />
        </Button>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={ids.input} className="text-sm text-foreground/75">
          Name
        </label>
        <Input
          id={ids.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ids.error : undefined}
          autoFocus
          className="h-8 w-44"
        />
        <Button type="submit" size="sm">Save</Button>
      </div>
      {error ? (
        <p id={ids.error} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}

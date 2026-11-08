"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { CODE_PATTERN } from "@/learning/arena/protocol";
import { ArenaError, joinRoom } from "@/lib/arena-client";
import { cn } from "@/lib/utils";
import { Tile } from "./tile";

const CODE_LENGTH = 6;
const NOT_CODE_LETTERS = /[^A-Z0-9]/g;

/** The code in what the learner typed or pasted: a code ("k7p 2qx") or an invite link (`…/arena/room?code=K7P2QX`). */
export function codeFrom(text: string): string {
  const fromLink = /[?&]code=([A-Za-z0-9]+)/.exec(text)?.[1];
  return (fromLink ?? text).toUpperCase().replace(NOT_CODE_LETTERS, "").slice(0, CODE_LENGTH);
}

export function roomPath(code: string): string {
  return `/arena/room?code=${code}`;
}

interface CodeInputProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
  invalid?: boolean;
  describedBy?: string;
}

/** Six code tiles over one real input: typing, pasting a code or a link, and screen readers all work on the input. */
export function CodeInput({ id, value, onChange, invalid, describedBy }: CodeInputProps) {
  const letters = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");
  return (
    <div className="relative w-full max-w-sm">
      <div aria-hidden className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {letters.map((letter, i) => (
          <Tile key={i} size="lg" state={letter ? "filled" : "empty"} className={cn("aspect-square h-auto w-full", invalid && "border-destructive")}>
            {letter || "·"}
          </Tile>
        ))}
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(codeFrom(event.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="peer absolute inset-0 h-full w-full cursor-text rounded-lg bg-transparent text-transparent caret-transparent opacity-0 focus:opacity-0"
      />
      <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-xl ring-ring/50 peer-focus-visible:ring-3" />
    </div>
  );
}

/**
 * The hub's "Vào phòng bằng mã" card (quick 059; feature 024 AC-005). A signed-in learner's code is
 * checked with the server so a wrong one is said here (023 AC-005); a guest goes straight to the
 * room, whose own sign-in prompt takes over.
 */
export function JoinRoom({ name, className }: { name?: string; className?: string }) {
  const router = useRouter();
  const { status } = useAccount();
  const inputId = useId();
  const textId = useId();
  const messageId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const complete = CODE_PATTERN.test(code);

  function handleCodeChange(next: string) {
    setCode(next);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!complete || joining) return;
    setJoining(true);
    if (!canUseLockedAreas(status)) {
      router.push(roomPath(code));
      return;
    }
    try {
      await joinRoom(code, name);
      router.push(roomPath(code));
    } catch (cause) {
      setError(cause instanceof ArenaError ? cause.message : "Không vào được phòng. Bạn thử lại nhé.");
      setJoining(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-5 rounded-2xl border bg-card p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8", className)}>
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <KeyRound className="size-6" />
        </span>
        <div className="grid gap-1">
          <label htmlFor={inputId} className="text-lg font-bold">
            Vào phòng bằng mã
          </label>
          <p id={textId} className="text-sm text-muted-foreground">
            Bạn bè đã tạo phòng? Nhập 6 ký tự họ gửi, hoặc dán liên kết mời.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <CodeInput id={inputId} value={code} onChange={handleCodeChange} invalid={Boolean(error)} describedBy={error ? messageId : textId} />
          <Button type="submit" size="lg" className="h-12 w-full gap-2 sm:w-fit" disabled={!complete || joining}>
            <LogIn aria-hidden />
            {joining ? "Đang vào phòng…" : "Vào phòng"}
          </Button>
        </div>
        {error ? (
          <p id={messageId} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

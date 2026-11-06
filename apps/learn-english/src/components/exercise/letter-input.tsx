"use client";

import { useEffect, useRef } from "react";
import { LetterSlots } from "@/components/arena/letter-slots";
import { normalize } from "@/learning/normalize";
import { cn } from "@/lib/utils";
import { TelexHint } from "./english-input";

const LETTER = /[\p{L}\p{N}]/gu;

function letterCount(text: string): number {
  return normalize(text).match(LETTER)?.length ?? 0;
}

interface LetterInputProps {
  /** The word's shape: "_" per letter, with its spaces, hyphens and apostrophes ("___-_____"). */
  mask: string;
  /** The word itself, when the learner may see it checked letter by letter (practice, not the Arena). */
  answer?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label": string;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * The word's letter tiles over one real input, like the room code: typing, pasting and screen
 * readers all work on the input, which takes focus as the question opens. Telex output is folded
 * back to ASCII before the tiles show it, and the input takes no more letters than there are tiles.
 */
export function LetterInput({ mask, answer, value, onChange, disabled, invalid, "aria-label": label, ref }: LetterInputProps) {
  const ownRef = useRef<HTMLInputElement>(null);
  const slots = mask.split("_").length - 1;

  useEffect(() => {
    ownRef.current?.focus({ preventScroll: true });
  }, []);

  function setRefs(node: HTMLInputElement | null) {
    ownRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (letterCount(next) <= slots) onChange(next);
  }

  return (
    <div className="grid gap-2">
      <div className={cn("relative rounded-lg", invalid && "[&_[data-slot=tile]]:border-destructive")}>
        <LetterSlots mask={mask} typed={normalize(value)} answer={answer} />
        <input
          ref={setRefs}
          lang="en"
          aria-label={label}
          aria-invalid={invalid || undefined}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          className="peer absolute inset-0 h-full w-full cursor-text rounded-lg bg-transparent text-transparent caret-transparent opacity-0 focus:opacity-0 disabled:cursor-default"
        />
        <span aria-hidden className="pointer-events-none absolute -inset-1.5 rounded-xl ring-ring/50 peer-focus-visible:ring-3" />
      </div>
      <TelexHint value={value} />
    </div>
  );
}

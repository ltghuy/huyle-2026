"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionListProps {
  options: readonly string[];
  selected: number | null;
  onSelect: (index: number) => void;
  /** After grading: the right option, to mark correct and wrong choices. */
  answerIndex?: number;
  /** Language of the option text, for screen readers. */
  lang?: "en" | "vi";
  label: string;
  /** "letters" marks options A–D (exam style) and also takes the A–D keys. */
  marks?: "numbers" | "letters";
}

const LETTERS = "ABCDEFGH";

/** Big single-choice buttons; keys 1–4 (and A–D when lettered) pick an option until it is graded. */
export function OptionList({ options, selected, onSelect, answerIndex, lang, label, marks = "numbers" }: OptionListProps) {
  const graded = answerIndex !== undefined;

  useEffect(() => {
    if (graded) return;
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey) return;
      const letter = marks === "letters" && event.key.length === 1 ? LETTERS.indexOf(event.key.toUpperCase()) : -1;
      const index = letter >= 0 ? letter : Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < options.length) onSelect(index);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [graded, options.length, onSelect, marks]);

  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3">
      {options.map((option, index) => {
        const isAnswer = graded && index === answerIndex;
        const isWrongChoice = graded && index === selected && index !== answerIndex;
        return (
          <button
            key={`${index}-${option}`}
            type="button"
            role="radio"
            aria-checked={selected === index}
            disabled={graded}
            onClick={() => onSelect(index)}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-base transition-colors",
              "hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent",
              selected === index && !graded && "border-primary bg-primary/5",
              isAnswer && "border-success bg-success/10",
              isWrongChoice && "border-destructive bg-destructive/10",
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border text-sm text-muted-foreground" aria-hidden>
              {marks === "letters" ? LETTERS[index] : index + 1}
            </span>
            <span className="flex-1" lang={lang}>
              {option}
            </span>
            {isAnswer ? <CheckCircle2 className="size-5 text-success" aria-label="Đáp án đúng" /> : null}
            {isWrongChoice ? <XCircle className="size-5 text-destructive" aria-label="Lựa chọn của bạn" /> : null}
          </button>
        );
      })}
    </div>
  );
}

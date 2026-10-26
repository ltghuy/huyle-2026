"use client";

import { useRef } from "react";

import { type CodeLang, CodeLine, highlightLines } from "@/components/playground/code";
import { cn } from "@/lib/utils";

// An editable code box with editor colours: a native textarea (transparent
// text, visible caret) laid over a coloured copy of its text. Both sit in one
// grid cell, so they share their size; only horizontal scrolling is mirrored.
// Typing, selection, labels and keyboard behaviour stay the browser's own.

type Props = Omit<React.ComponentProps<"textarea">, "value" | "wrap"> & { value: string; lang?: CodeLang };

const SHARED = "col-start-1 row-start-1 m-0 px-2.5 py-2 font-mono text-xs leading-relaxed whitespace-pre [tab-size:2]";

export function CodeEditor({ value, lang = "ts", className, onScroll, ...textarea }: Props) {
  const mirror = useRef<HTMLPreElement>(null);

  function handleScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    if (mirror.current) mirror.current.scrollLeft = event.currentTarget.scrollLeft;
    onScroll?.(event);
  }

  return (
    <div
      className={cn(
        "grid min-w-0 overflow-hidden rounded-lg border border-input transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      <pre ref={mirror} aria-hidden className={cn(SHARED, "pointer-events-none overflow-hidden")}>
        {highlightLines(value, lang).map((line, i) => (
          <span key={i} className="block">
            <CodeLine tokens={line} />
          </span>
        ))}
        {/* A trailing newline needs a line of its own, or the caret has nowhere to go. */}
        {value.endsWith("\n") ? <span className="block"> </span> : null}
      </pre>
      <textarea
        {...textarea}
        value={value}
        wrap="off"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        onScroll={handleScroll}
        className={cn(
          SHARED,
          "resize-none overflow-x-auto overflow-y-hidden bg-transparent text-transparent caret-foreground outline-none placeholder:text-muted-foreground",
          "selection:bg-[color-mix(in_oklch,var(--selection),transparent_65%)] selection:text-transparent",
        )}
      />
    </div>
  );
}

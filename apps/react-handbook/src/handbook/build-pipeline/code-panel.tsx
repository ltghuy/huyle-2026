"use client";

import { Code, type CodeLang, langFor } from "@/components/playground/code";
import { cn } from "@/lib/utils";

import { sizeLabel, useSize } from "./sizes";

/** A titled block of code with its real size. */
export function CodePanel({
  title,
  code,
  className,
  showSize = true,
  wrap = false,
  lang,
}: {
  title: string;
  code: string;
  className?: string;
  showSize?: boolean;
  /** Wrap long lines, for minified one-line output. */
  wrap?: boolean;
  /** Colours to use; by default guessed from the title (styles.css, Greeting.js.map, …). */
  lang?: CodeLang;
}) {
  const size = useSize(code);
  return (
    <figure className={cn("flex min-w-0 flex-col overflow-hidden rounded-lg border", className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b bg-muted/50 px-3 py-1.5 text-xs">
        <span className="font-mono font-medium break-all">{title}</span>
        {showSize ? <span className="text-muted-foreground tabular-nums">{sizeLabel(size)}</span> : null}
      </figcaption>
      <pre tabIndex={0} aria-label={`Code: ${title}`} className={cn("max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50", wrap && "break-all whitespace-pre-wrap")}>
        <code>
          <Code code={code} lang={lang ?? langFor(title)} />
        </code>
      </pre>
    </figure>
  );
}

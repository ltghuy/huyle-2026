import { type CodeLang, CodeTokens, highlightFlat, sliceTokens } from "@/components/playground/code";
import { cn } from "@/lib/utils";

/** Source text with editor colours and one range marked, such as the text a tree node came from. */
export function SourceView({ source, highlight, label, className, lang = "ts" }: { source: string; highlight: { start: number; end: number } | null; label: string; className?: string; lang?: CodeLang }) {
  const range = highlight && highlight.start >= 0 && highlight.end >= highlight.start ? highlight : null;
  const tokens = highlightFlat(source, lang);
  return (
    <pre tabIndex={0} aria-label={label} className={cn("max-h-80 overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      {range ? (
        <code>
          <CodeTokens tokens={sliceTokens(tokens, 0, range.start)} />
          <mark className="rounded-sm bg-primary/25 text-foreground ring-1 ring-primary">
            <CodeTokens tokens={sliceTokens(tokens, range.start, Math.max(range.end, range.start + 1))} />
          </mark>
          <CodeTokens tokens={sliceTokens(tokens, Math.max(range.end, range.start + 1), Infinity)} />
        </code>
      ) : (
        <code>
          <CodeTokens tokens={tokens} />
        </code>
      )}
    </pre>
  );
}

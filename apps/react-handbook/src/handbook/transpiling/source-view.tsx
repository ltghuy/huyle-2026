import { cn } from "@/lib/utils";

/** Source text with one range marked, such as the text a tree node came from. */
export function SourceView({ source, highlight, label, className }: { source: string; highlight: { start: number; end: number } | null; label: string; className?: string }) {
  const range = highlight && highlight.start >= 0 && highlight.end >= highlight.start ? highlight : null;
  return (
    <pre tabIndex={0} aria-label={label} className={cn("max-h-80 overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}>
      {range ? (
        <code>
          {source.slice(0, range.start)}
          <mark className="rounded-sm bg-primary/25 text-foreground ring-1 ring-primary">{source.slice(range.start, Math.max(range.end, range.start + 1))}</mark>
          {source.slice(Math.max(range.end, range.start + 1))}
        </code>
      ) : (
        <code>{source}</code>
      )}
    </pre>
  );
}

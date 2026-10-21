import { cn } from "@/lib/utils";

/** A file from the suite with line numbers; `marked` lines are highlighted. */
export function CodeBlock({ path, code, marked, label }: { path: string; code: string | null; marked?: ReadonlySet<number>; label?: string }) {
  if (code === null) {
    return <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">{path} isn&apos;t in the recorded run. Run the suite to record it.</p>;
  }
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <figcaption className="font-mono text-xs text-foreground/75">{path}</figcaption>
      <pre className="relative max-h-[28rem] overflow-auto rounded-lg border bg-muted/40 py-2 font-mono text-xs leading-relaxed" tabIndex={0} aria-label={label ?? path}>
        <code className="grid min-w-max">
          {lines.map((line, i) => (
            <span key={i} className={cn("grid grid-cols-[2.5rem_1fr] pr-3", marked?.has(i + 1) && "bg-primary/10")}>
              <span aria-hidden className="pr-3 text-right text-foreground/70 select-none tabular-nums">
                {i + 1}
              </span>
              <span>{line || " "}</span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

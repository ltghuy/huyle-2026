export type TocItem = { id: string; title: string };

/** "On this page": numbered jump links to each topic. */
export function Toc({ items }: { items: readonly TocItem[] }) {
  return (
    <nav aria-labelledby="toc-heading" className="rounded-xl border bg-card p-4">
      <h2 id="toc-heading" className="text-sm font-medium">
        On this page
      </h2>
      <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        {items.map((item, i) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className="flex gap-2 rounded-sm py-1 underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
              <span className="font-mono text-xs leading-5 text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

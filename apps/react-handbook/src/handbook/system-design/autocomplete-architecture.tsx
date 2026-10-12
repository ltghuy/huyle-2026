// Theme-aware inline diagram of an autocomplete's architecture. One example.

function Box({ x, y, w, h, title, sub }: { x: number; y: number; w: number; h: number; title: string; sub?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} className="fill-card stroke-border" strokeWidth={1.5} />
      <text x={x + w / 2} y={sub ? y + h / 2 - 4 : y + h / 2 + 4} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
        {title}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, dashed }: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground" strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} markerEnd="url(#ac-arrow)" />;
}

export function AutocompleteArchitecture() {
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 640 230" className="w-full" role="img" aria-labelledby="ac-arch-title ac-arch-desc">
        <title id="ac-arch-title">Autocomplete architecture</title>
        <desc id="ac-arch-desc">
          A combobox input and a results listbox sit over a query engine that debounces input, checks a query-keyed cache, and otherwise calls a suggestion source; a
          latest-request guard drops out-of-order responses.
        </desc>
        <defs>
          <marker id="ac-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
          </marker>
        </defs>

        <rect x={12} y={12} width={300} height={206} rx={12} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={22} y={30} className="fill-muted-foreground text-[10px] font-medium">
          Browser
        </text>
        <Box x={40} y={42} w={120} h={46} title="Combobox input" sub="role=combobox" />
        <Box x={176} y={42} w={120} h={46} title="Results listbox" sub="role=listbox" />
        <Box x={40} y={110} w={120} h={46} title="Query engine" sub="debounce + guard" />
        <Box x={176} y={110} w={120} h={46} title="Cache" sub="by normalised query" />

        <rect x={356} y={12} width={272} height={206} rx={12} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={366} y={30} className="fill-muted-foreground text-[10px] font-medium">
          Server / edge
        </text>
        <Box x={398} y={84} w={190} h={46} title="Suggestion source" sub="search index" />

        <Arrow x1={100} y1={88} x2={100} y2={110} />
        <Arrow x1={160} y1={133} x2={176} y2={133} />
        <Arrow x1={100} y1={110} x2={236} y2={65} />
        <Arrow x1={160} y1={120} x2={398} y2={110} />
        <Arrow x1={398} y1={118} x2={236} y2={65} dashed />
      </svg>
      <figcaption className="text-xs text-foreground/75">
        One example. Solid arrows: a request path (input → engine → cache or source). Dashed: the response, which the latest-request guard may drop. A larger system would
        put the suggestion source behind an edge search index close to users.
      </figcaption>
    </figure>
  );
}

// A theme-aware inline diagram of the feed's architecture. Boxes use theme
// tokens via Tailwind fill/stroke/text utilities, so it reads in light and dark.
// One example shape, not the only correct one.

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
  return <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-muted-foreground" strokeWidth={1.5} strokeDasharray={dashed ? "4 3" : undefined} markerEnd="url(#feed-arrow)" />;
}

export function FeedArchitecture() {
  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox="0 0 640 300" className="w-full" role="img" aria-labelledby="feed-arch-title feed-arch-desc">
        <title id="feed-arch-title">News feed architecture</title>
        <desc id="feed-arch-desc">
          The browser holds feed views, a feed store and a data layer. The data layer calls a feed API for pages of post ids and a post service for details; media loads
          from a CDN. An optional realtime channel pushes new posts.
        </desc>
        <defs>
          <marker id="feed-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
          </marker>
        </defs>

        {/* Client column */}
        <rect x={12} y={12} width={300} height={276} rx={12} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={22} y={30} className="fill-muted-foreground text-[10px] font-medium">
          Browser
        </text>
        <Box x={40} y={44} w={110} h={48} title="Feed view" sub="list + composer" />
        <Box x={174} y={44} w={110} h={48} title="Post card" sub="virtualized rows" />
        <Box x={40} y={120} w={110} h={48} title="Feed store" sub="ids + cursor" />
        <Box x={174} y={120} w={110} h={48} title="Post cache" sub="by id (normalised)" />
        <Box x={100} y={200} w={130} h={48} title="Data layer" sub="fetch · dedup · SWR" />

        {/* Server column */}
        <rect x={356} y={12} width={272} height={276} rx={12} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={366} y={30} className="fill-muted-foreground text-[10px] font-medium">
          Server / edge
        </text>
        <Box x={388} y={44} w={120} h={48} title="Feed API" sub="pages of ids (cursor)" />
        <Box x={388} y={120} w={120} h={48} title="Post service" sub="post details" />
        <Box x={388} y={200} w={120} h={48} title="Media CDN" sub="images · video" />
        <Box x={528} y={120} w={84} h={48} title="Realtime" sub="new posts" />

        {/* Edges */}
        <Arrow x1={95} y1={92} x2={95} y2={120} />
        <Arrow x1={229} y1={92} x2={229} y2={120} />
        <Arrow x1={95} y1={168} x2={140} y2={200} />
        <Arrow x1={229} y1={168} x2={190} y2={200} />
        <Arrow x1={230} y1={224} x2={388} y2={76} />
        <Arrow x1={230} y1={224} x2={388} y2={144} />
        <Arrow x1={229} y1={68} x2={388} y2={212} dashed />
        <Arrow x1={528} y1={144} x2={284} y2={144} dashed />
      </svg>
      <figcaption className="text-xs text-foreground/75">
        One example architecture. Solid arrows: data requests. Dashed: media load, and the optional realtime push. A simpler build could drop the realtime channel and the
        normalised cache and fetch whole posts per page.
      </figcaption>
    </figure>
  );
}

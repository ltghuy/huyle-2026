import { TEAM_PIECES } from "./store";

// The sample store as a theme-aware SVG: the shell composes three team-owned
// micro frontends, each released by its own pipeline to its own versioned URL.

const W = 168;
const COLUMN_X = [28, 236, 444];

export function StoreDiagram() {
  const id = "store-architecture";
  return (
    <div role="region" aria-label="Sample store architecture (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <svg viewBox="0 0 640 420" className="w-full min-w-[540px]" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>Sample store: a shell and three micro frontends</title>
        <desc id={`${id}-desc`}>
          The platform team&apos;s shell owns routing, the header and the layout, and composes three micro frontends: Catalog (Discovery team, home, search and
          product pages), Checkout (Checkout team, cart and checkout) and Account (Accounts team, account pages). Each has its own repository or folder and its own
          pipeline that builds, tests and deploys it to its own versioned URL. All of them use a shared design system and agreed event contracts, and the shell keeps
          a manifest of which version of each piece is live.
        </desc>
        <defs>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
          </marker>
        </defs>

        <rect x={196} y={16} width={248} height={60} rx={10} className="fill-primary/10 stroke-primary" strokeWidth={2} />
        <text x={320} y={38} textAnchor="middle" className="fill-foreground text-[12px] font-semibold">
          Shell
        </text>
        <text x={320} y={54} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          Platform team · routing, header, layout
        </text>
        <text x={320} y={67} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          manifest of live versions
        </text>

        {TEAM_PIECES.map((p, i) => {
          const x = COLUMN_X[i];
          const cx = x + W / 2;
          return (
            <g key={p.id}>
              <line x1={320} y1={76} x2={cx} y2={124} className="stroke-muted-foreground/70" strokeWidth={1.25} markerEnd={`url(#${id}-arrow)`} />
              <rect x={x} y={126} width={W} height={56} rx={8} className="fill-card stroke-border" strokeWidth={1.25} />
              <text x={cx} y={147} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                {p.name}
              </text>
              <text x={cx} y={162} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {p.team} team
              </text>
              <text x={cx} y={175} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
                {p.owns.join(" ")}
              </text>

              <line x1={cx} y1={182} x2={cx} y2={214} className="stroke-muted-foreground/70" strokeWidth={1.25} markerEnd={`url(#${id}-arrow)`} />
              <rect x={x + 14} y={216} width={W - 28} height={40} rx={8} className="fill-muted/40 stroke-border" strokeWidth={1} />
              <text x={cx} y={232} textAnchor="middle" className="fill-foreground text-[10px]">
                own repo or folder
              </text>
              <text x={cx} y={246} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                build · test · deploy
              </text>

              <line x1={cx} y1={256} x2={cx} y2={290} className="stroke-muted-foreground/70" strokeWidth={1.25} markerEnd={`url(#${id}-arrow)`} />
              <text x={cx + 6} y={277} className="fill-muted-foreground font-mono text-[9px]">
                v{p.version}
              </text>
            </g>
          );
        })}

        <rect x={28} y={292} width={584} height={40} rx={8} className="fill-card stroke-border" strokeWidth={1.25} />
        <text x={320} y={310} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          CDN: each piece&apos;s files at its own versioned URL
        </text>
        <text x={320} y={324} textAnchor="middle" className="fill-muted-foreground text-[9px]">
          the shell reads the manifest to know which version to load
        </text>

        <rect x={28} y={352} width={584} height={52} rx={10} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={40} y={368} className="fill-muted-foreground text-[10px] font-medium">
          Shared by every piece, owned by the platform team
        </text>
        <text x={40} y={386} className="fill-foreground text-[10px]">
          design system and theme tokens · event and URL contracts · shared libraries (framework, router)
        </text>
      </svg>
    </div>
  );
}

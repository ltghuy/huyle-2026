import { cn } from "@/lib/utils";

import { CODE_PROJECTS, PROJECTS, project } from "./repo";

// The sample repo's dependency graph as a theme-aware SVG, drawn from the same
// data the demos run on. Arrows point from a project to what it depends on.

export type NodeTone = "idle" | "changed" | "affected" | "muted" | "source" | "target";

const W = 124;
const H = 40;

/** Top-left corner of each project's box: one row per layer. */
const POSITION: Record<string, { x: number; y: number }> = {
  web: { x: 56, y: 24 },
  admin: { x: 258, y: 24 },
  marketing: { x: 460, y: 24 },
  billing: { x: 120, y: 112 },
  auth: { x: 330, y: 112 },
  ui: { x: 170, y: 200 },
  api: { x: 380, y: 200 },
  utils: { x: 274, y: 288 },
  tsconfig: { x: 176, y: 380 },
  "eslint-config": { x: 376, y: 380 },
};

const LAYERS = [
  { label: "Apps", y: 24 },
  { label: "Features", y: 112 },
  { label: "UI · data", y: 200 },
  { label: "Utilities", y: 288 },
];

const TONE: Record<NodeTone, string> = {
  idle: "fill-card stroke-border",
  muted: "fill-card stroke-border opacity-60",
  changed: "fill-primary/15 stroke-primary",
  affected: "fill-warning/20 stroke-[color-mix(in_oklch,var(--warning),black_20%)] dark:stroke-warning",
  source: "fill-info/15 stroke-info",
  target: "fill-primary/15 stroke-primary",
};

type Edge = { from: string; to: string };

// Every code project depends on utils directly; drawing all of those arrows hides
// the rest of the graph, so only the bottom layer's are drawn and a label says so.
const EDGES: Edge[] = CODE_PROJECTS.flatMap((p) => p.deps.filter((to) => to !== "utils" || p.kind === "ui" || p.kind === "data").map((to) => ({ from: p.id, to })));

function endpoints({ from, to }: Edge) {
  const a = POSITION[from];
  const b = POSITION[to];
  if (a.y === b.y) {
    const leftToRight = a.x < b.x;
    return { x1: leftToRight ? a.x + W : a.x, y1: a.y + H / 2, x2: leftToRight ? b.x : b.x + W, y2: b.y + H / 2 };
  }
  // Spread a box's outgoing edges along its bottom edge so they don't overlap.
  const siblings = EDGES.filter((e) => e.from === from);
  const index = siblings.findIndex((e) => e.to === to);
  const x1 = a.x + (W * (index + 1)) / (siblings.length + 1);
  return { x1, y1: a.y + H, x2: b.x + W / 2, y2: b.y };
}

export function RepoGraph({
  title,
  description,
  tone = () => "idle",
  highlight,
  proposed,
}: {
  title: string;
  description: string;
  tone?: (id: string) => NodeTone;
  /** Edges to emphasise, as "from>to". */
  highlight?: ReadonlySet<string>;
  /** A new import being tried in the boundaries demo. */
  proposed?: { from: string; to: string; allowed: boolean };
}) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div role="region" aria-label={`${title} (scrollable)`} tabIndex={0} className="relative overflow-x-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <svg viewBox="0 0 640 440" className="w-full min-w-[540px]" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{description}</desc>
        <defs>
          <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-muted-foreground" />
          </marker>
          <marker id={`${id}-arrow-strong`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-foreground" />
          </marker>
          <marker id={`${id}-arrow-bad`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="fill-destructive" />
          </marker>
        </defs>

        {LAYERS.map((layer) => (
          <text key={layer.label} x={8} y={layer.y + H / 2 + 4} className="fill-muted-foreground text-[10px] font-medium">
            {layer.label}
          </text>
        ))}

        <text x={POSITION.utils.x + W + 10} y={POSITION.utils.y + 17} className="fill-muted-foreground text-[10px]">
          <tspan>Every project uses it;</tspan>
          <tspan x={POSITION.utils.x + W + 10} dy={13}>
            arrows from ui and api only
          </tspan>
        </text>

        <rect x={150} y={360} width={370} height={72} rx={10} className="fill-muted/40 stroke-border" strokeWidth={1} strokeDasharray="5 4" />
        <text x={160} y={374} className="fill-muted-foreground text-[10px] font-medium">
          Tooling every project uses (arrows omitted)
        </text>

        {EDGES.map((edge) => {
          const strong = highlight?.has(`${edge.from}>${edge.to}`);
          const { x1, y1, x2, y2 } = endpoints(edge);
          return (
            <line
              key={`${edge.from}>${edge.to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={strong ? "stroke-foreground" : "stroke-muted-foreground/60"}
              strokeWidth={strong ? 2 : 1.25}
              markerEnd={`url(#${id}-${strong ? "arrow-strong" : "arrow"})`}
            />
          );
        })}

        {proposed && proposed.from !== proposed.to ? (
          <ProposedEdge id={id} {...proposed} />
        ) : null}

        {PROJECTS.map((p) => {
          const { x, y } = POSITION[p.id];
          const nodeTone = tone(p.id);
          return (
            <g key={p.id}>
              <rect x={x} y={y} width={W} height={H} rx={8} className={cn(TONE[nodeTone])} strokeWidth={nodeTone === "idle" || nodeTone === "muted" ? 1.25 : 2} />
              <text x={x + W / 2} y={y + 17} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                {p.name}
              </text>
              <text x={x + W / 2} y={y + 31} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {p.path}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProposedEdge({ id, from, to, allowed }: { id: string; from: string; to: string; allowed: boolean }) {
  const a = POSITION[from];
  const b = POSITION[to];
  // Curve out to the side so the new import stands apart from existing edges.
  const sameRow = a.y === b.y;
  const x1 = a.x + W / 2;
  const y1 = sameRow ? a.y : a.y + (b.y > a.y ? H : 0);
  const x2 = b.x + W / 2;
  const y2 = sameRow ? b.y : b.y + (b.y > a.y ? 0 : H);
  const bend = sameRow ? -36 : 0;
  const cx = (x1 + x2) / 2 + (sameRow ? 0 : 70);
  const cy = (y1 + y2) / 2 + bend;
  return (
    <path
      d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`}
      fill="none"
      className={allowed ? "stroke-foreground" : "stroke-destructive"}
      strokeWidth={2}
      strokeDasharray="6 4"
      markerEnd={`url(#${id}-${allowed ? "arrow-strong" : "arrow-bad"})`}
    />
  );
}

/** Label for a project id, for text next to the graph. */
export function projectName(id: string) {
  return project(id).name;
}

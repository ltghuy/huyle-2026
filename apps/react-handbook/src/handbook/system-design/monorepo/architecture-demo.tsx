import { RepoGraph } from "./repo-graph";

// The sample repo's architecture, and the two alternatives a design should name.

const SHAPES = [
  {
    name: "Monorepo",
    what: "Every app and package in one repository, one install, one task runner.",
    wins: "A change to a shared package and all its consumers lands in one reviewed commit; one toolchain; refactors across apps are atomic.",
    costs: "Needs a task graph, caching and affected runs to keep CI fast, plus boundary rules and CODEOWNERS so it doesn't become one tangled app.",
  },
  {
    name: "Polyrepo",
    what: "A repository per app or package; shared code is published and consumed by version.",
    wins: "Hard boundaries and independent pipelines for free; each team owns its repo end to end.",
    costs: "A change to shared code means publish, then bump every consumer repo; versions drift and toolchains diverge.",
  },
  {
    name: "Micro-frontends",
    what: "Separately built and deployed apps composed into one page at runtime.",
    wins: "Teams deploy on their own schedule, even with different frameworks.",
    costs: "Runtime integration, duplicated dependencies in the browser and a shared-state contract. It's a deploy strategy and can live in either repo shape.",
  },
];

export function ArchitectureDemo() {
  return (
    <div className="flex flex-col gap-5">
      <figure className="flex flex-col gap-2">
        <RepoGraph
          title="Sample monorepo"
          description="Three apps (web, admin, marketing) depend on two feature packages (auth, billing; billing also uses auth), which depend on a UI kit and an API client, which both depend on a utilities package. Every project uses the shared tsconfig and ESLint config. A package manager links the packages; a task runner builds them in this order and caches the results."
        />
        <figcaption className="text-xs text-foreground/75">
          One example. Arrows point from a project to what it depends on, so builds run bottom-up. Under it sit the workspace (install and link) and the task runner (graph,
          cache, affected). The same graph drives every demo on this page. A smaller team could start with apps and one shared package and split later.
        </figcaption>
      </figure>

      <ul className="grid gap-3 md:grid-cols-3">
        {SHAPES.map((shape) => (
          <li key={shape.name} className="flex flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">{shape.name}</h4>
            <p className="text-sm text-foreground/85">{shape.what}</p>
            <dl className="flex flex-col gap-1 text-xs">
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <dt className="font-medium text-success">Wins</dt>
                <dd className="text-foreground/85">{shape.wins}</dd>
              </div>
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <dt className="font-medium text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning">Costs</dt>
                <dd className="text-foreground/85">{shape.costs}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

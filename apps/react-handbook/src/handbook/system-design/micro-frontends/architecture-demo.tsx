import { StoreDiagram } from "./store-diagram";

// The sample store's architecture, and the two alternatives a design should name.

const SHAPES = [
  {
    name: "One app",
    what: "One codebase, one build, one deploy. Teams work in folders of the same app.",
    wins: "Simplest to build, test and run; one copy of every library; refactors across features are one commit.",
    costs: "Every team ships on the same release train, and one team's broken build or test blocks the rest.",
  },
  {
    name: "Modular monolith",
    what: "One deployed app made of packages with enforced boundaries, often in a monorepo.",
    wins: "Clear ownership and boundaries without runtime integration; affected builds and caching keep CI fast.",
    costs: "Still one deploy: teams can work apart but can't release apart, and everyone upgrades the framework together.",
  },
  {
    name: "Micro frontends",
    what: "Separately built and released pieces, put together into one product at build time, on the server or in the browser.",
    wins: "Each team releases on its own schedule and can roll back alone; a legacy app can be replaced one route at a time.",
    costs: "Integration work at runtime, shared-library negotiation, cross-team contracts, consistent styling and more to monitor.",
  },
];

export function ArchitectureDemo() {
  return (
    <div className="flex flex-col gap-5">
      <figure className="flex flex-col gap-2">
        <StoreDiagram />
        <figcaption className="text-xs text-foreground/75">
          One example. Arrows point from the shell to the pieces it composes, at build time, on the server or in the browser (topic 3 compares them). The shell is thin: it owns the frame and routing and holds no product features. A smaller store could start with only the route-level split
          (catalog and checkout as separate apps under one domain) and never compose pieces on the same page.
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

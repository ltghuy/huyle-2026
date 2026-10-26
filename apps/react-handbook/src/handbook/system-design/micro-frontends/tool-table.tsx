import { cn } from "@/lib/utils";

import type { ApproachId } from "./composition";

// Common tools per composition approach. Facts and versions from
// .artifacts/research/micro-frontends.md; update both together.

export const RESEARCHED = "October 2026";

const TOOLS: readonly { name: string; approach: ApproachId; status: string; note: string }[] = [
  {
    name: "Next.js Multi-Zones",
    approach: "route",
    status: "Documented in Next.js 16",
    note: "Separate Next.js apps per set of paths, each with its own assetPrefix, joined by rewrites. Moving between zones is a full page load, so links across zones use <a>.",
  },
  { name: "Vercel Microfrontends", approach: "route", status: "Generally available", note: "Managed path routing of several projects under one domain, set in microfrontends.json." },
  { name: "A reverse proxy or CDN rules", approach: "route", status: "Any host", note: "Path-based routing in nginx or your CDN does the same job without a framework feature." },
  { name: "Workspace packages", approach: "build", status: "Any package manager", note: "Each piece is a package in a monorepo or on a registry; the shell installs and bundles them." },
  { name: "Server Side Includes (nginx)", approach: "server", status: "Stable", note: "An include directive in the HTML names a fragment URL; nginx fetches several includes in parallel." },
  { name: "Podium", approach: "server", status: "Maintained (5.4.10)", note: "Node.js podlets serve HTML fragments; a layout server fetches and stitches them." },
  { name: "Tailor (Zalando)", approach: "server", status: "Archived (2022)", note: "A streaming layout service for fragments. Its repository is archived, so pick something maintained." },
  { name: "Edge Side Includes", approach: "edge", status: "W3C Note from 2001", note: "<esi:include src=\"…\" alt=\"…\"> with a fallback URL, processed by CDNs that support it." },
  { name: "web-fragments (Cloudflare)", approach: "edge", status: "Pre-1.0 (0.8.2)", note: "Renders fragments on edge workers and moves them into a client app once ready." },
  {
    name: "Module Federation 2.0",
    approach: "client",
    status: "Active (2.9.2)",
    note: "Shared-library negotiation, a manifest, runtime remotes and plugins. Runs on webpack, Rspack and Vite (@module-federation/vite).",
  },
  { name: "Native Federation", approach: "client", status: "Active (core 4.8.1)", note: "The Module Federation model on ES modules and import maps, with an Angular adapter that supports SSR." },
  {
    name: "single-spa + import maps",
    approach: "client",
    status: "6.0.3 stable, 7.0 in beta",
    note: "A root config mounts apps by route; its docs recommend import maps to load each app and the framework once.",
  },
  {
    name: "Module Federation for Next.js",
    approach: "client",
    status: "Maintenance mode",
    note: "Pages Router only, supports up to Next.js 15. Next.js points to Multi-Zones instead.",
  },
  { name: "Plain iframes + postMessage", approach: "iframe", status: "Built into browsers", note: "No library needed; each frame needs a title, and its height has to be sent to the parent." },
];

const APPROACH_LABEL: Record<ApproachId, string> = {
  route: "Route-level split",
  build: "Build-time packages",
  server: "Server-side",
  edge: "Edge",
  client: "Client-side runtime",
  iframe: "Iframes",
};

export function ToolTable({ highlight }: { highlight: ApproachId }) {
  return (
    <div className="flex flex-col gap-2">
      <div role="region" aria-label="Tools by composition approach (scrollable)" tabIndex={0} className="relative overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[640px] text-xs">
          <caption className="px-3 pt-2 text-left text-foreground/75">Common tools for each approach, as of {RESEARCHED}. Rows for the picked approach are highlighted.</caption>
          <thead className="text-left text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Tool</th>
              <th scope="col" className="px-3 py-2 font-medium">Approach</th>
              <th scope="col" className="px-3 py-2 font-medium">Status</th>
              <th scope="col" className="w-1/2 px-3 py-2 font-medium">What it does</th>
            </tr>
          </thead>
          <tbody>
            {TOOLS.map((t) => (
              <tr key={t.name} className={cn("border-t align-top", t.approach === highlight && "bg-primary/5")}>
                <th scope="row" className="px-3 py-2 text-left font-medium">
                  {t.name}
                </th>
                <td className="px-3 py-2">{APPROACH_LABEL[t.approach]}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2 text-foreground/85">{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-foreground/75">One snapshot. These tools change quickly, so check their docs before you choose.</p>
    </div>
  );
}

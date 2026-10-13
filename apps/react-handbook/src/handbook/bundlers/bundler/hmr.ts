import type { Graph } from "./graph";

// Hot module replacement: after an edit, the dev server walks from the edited
// module up through its importers. A module that "accepts" updates (in React,
// a module that only exports components, via Fast Refresh) is a boundary:
// it and the modules below it are re-run in place. If any path reaches a
// module with no importers without meeting a boundary, the page reloads.

export type HmrResult = { chains: string[][]; boundaries: string[]; fullReload: boolean; reason: string };

export function propagate(graph: Graph, edited: string, accepts: Set<string>): HmrResult {
  const chains: string[][] = [];
  const boundaries = new Set<string>();
  let fullReload = false;
  let reason = "";
  const walk = (path: string, chain: string[]) => {
    if (fullReload) return;
    const next = [...chain, path];
    if (accepts.has(path)) {
      boundaries.add(path);
      chains.push(next);
      return;
    }
    const importers = graph.importers.get(path) ?? [];
    if (importers.length === 0) {
      fullReload = true;
      reason = `${path} has no importers left and doesn't accept the update`;
      chains.push(next);
      return;
    }
    for (const importer of importers) {
      if (chain.includes(importer)) {
        fullReload = true;
        reason = `circular import: ${[...next, importer].join(" → ")}`;
        chains.push([...next, importer]);
        return;
      }
      walk(importer, next);
    }
  };
  walk(edited, []);
  return { chains, boundaries: [...boundaries], fullReload, reason };
}

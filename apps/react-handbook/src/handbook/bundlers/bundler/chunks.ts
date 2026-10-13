import type { Graph } from "./graph";
import type { ChunkPlan } from "./link";

// Code splitting: the entry chunk holds everything the entry imports
// statically. Each dynamically imported module starts a lazy chunk with its
// own static imports, minus what the entry chunk already has. A module that
// two lazy chunks both need is either duplicated in each, or moved into a
// shared chunk that both load first.

export type ChunkInfo = { id: string; kind: "entry" | "lazy" | "shared"; modules: string[]; loadedFor: string[] };

function staticClosure(graph: Graph, start: string, exclude: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (path: string) => {
    if (seen.has(path) || exclude.has(path)) return;
    seen.add(path);
    out.push(path);
    for (const imp of graph.modules.get(path)?.imports ?? []) if (imp.kind !== "dynamic" && imp.resolved) walk(imp.resolved);
  };
  walk(start);
  return out;
}

function chunkName(path: string) {
  return (path.split("/").pop() ?? path).replace(/\.\w+$/, "");
}

export function planChunks(graph: Graph, options: { splitShared: boolean }): { plan: ChunkPlan; chunks: ChunkInfo[] } {
  const entryModules = staticClosure(graph, graph.entry, new Set());
  const inEntry = new Set(entryModules);
  const lazyTargets = [...new Set([...graph.modules.values()].flatMap((m) => m.imports.filter((i) => i.kind === "dynamic" && i.resolved && !inEntry.has(i.resolved)).map((i) => i.resolved!)))];
  const lazy = lazyTargets.map((target) => ({ target, id: chunkName(target), modules: staticClosure(graph, target, inEntry) }));

  // Modules needed by two or more lazy chunks.
  const users = new Map<string, string[]>();
  for (const c of lazy) for (const m of c.modules) users.set(m, [...(users.get(m) ?? []), c.id]);
  const shared = new Map<string, string[]>();
  if (options.splitShared) {
    for (const [m, ids] of users) {
      if (ids.length < 2 || lazyTargets.includes(m)) continue;
      const id = `shared-${ids.join("-")}`;
      shared.set(id, [...(shared.get(id) ?? []), m]);
    }
  }
  const movedTo = new Map<string, string>();
  for (const [id, mods] of shared) for (const m of mods) movedTo.set(m, id);

  const chunks: ChunkInfo[] = [{ id: "main", kind: "entry", modules: entryModules, loadedFor: [graph.entry] }];
  for (const [id, mods] of shared) chunks.push({ id, kind: "shared", modules: mods, loadedFor: id.replace("shared-", "").split("-") });
  for (const c of lazy) chunks.push({ id: c.id, kind: "lazy", modules: c.modules.filter((m) => !movedTo.has(m)), loadedFor: [c.target] });

  const plan: ChunkPlan = {
    chunks: new Map(chunks.map((c) => [c.id, c.modules])),
    load: (path) => {
      const chunk = lazy.find((c) => c.target === path);
      if (!chunk) return [];
      const deps = [...new Set(chunk.modules.map((m) => movedTo.get(m)).filter((x): x is string => !!x))];
      return [...deps, chunk.id];
    },
  };
  return { plan, chunks };
}

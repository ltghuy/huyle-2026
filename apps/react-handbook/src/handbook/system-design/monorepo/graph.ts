import { PROJECTS, allDeps } from "./repo";

// Graph questions the demos ask about the sample repo.

/** The changed projects plus everything that depends on them, directly or not. */
export function affected(changed: Iterable<string>): Set<string> {
  const result = new Set(changed);
  const queue = [...result];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const p of PROJECTS) {
      if (!result.has(p.id) && allDeps(p.id).includes(id)) {
        result.add(p.id);
        queue.push(p.id);
      }
    }
  }
  return result;
}

/** A path of project ids from `from` to `to` following dependency edges, or null. */
export function findPath(from: string, to: string, deps: (id: string) => string[] = allDeps): string[] | null {
  const previous = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === to) {
      const path: string[] = [];
      for (let at: string | null = id; at !== null; at = previous.get(at) ?? null) path.unshift(at);
      return path;
    }
    for (const next of deps(id)) {
      if (!previous.has(next)) {
        previous.set(next, id);
        queue.push(next);
      }
    }
  }
  return null;
}

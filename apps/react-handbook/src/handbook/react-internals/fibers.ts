// Reads React's fiber tree. These are React 19.2 internals, not a public API:
// field names and tags can change in any release. Read-only and defensive.

export const FIBER_TAGS: Record<number, string> = {
  0: "FunctionComponent",
  1: "ClassComponent",
  3: "HostRoot",
  4: "HostPortal",
  5: "HostComponent",
  6: "HostText",
  7: "Fragment",
  8: "Mode",
  9: "ContextConsumer",
  10: "ContextProvider",
  11: "ForwardRef",
  12: "Profiler",
  13: "SuspenseComponent",
  14: "MemoComponent",
  15: "SimpleMemoComponent",
  16: "LazyComponent",
  22: "OffscreenComponent",
  26: "HostHoistable",
  27: "HostSingleton",
  31: "ActivityComponent",
};

export type Fiber = {
  tag: number;
  type: unknown;
  key: string | null;
  child: Fiber | null;
  sibling: Fiber | null;
  memoizedProps: Record<string, unknown> | string | null;
  memoizedState: unknown;
  alternate: Fiber | null;
  stateNode: unknown;
};

export type FiberView = {
  id: number;
  tag: string;
  name: string;
  key: string | null;
  detail: string;
  hooks: string[];
  children: FiberView[];
};

const ids = new WeakMap<object, number>();
let nextId = 1;

/** A stable number for a fiber object, to tell its two copies apart. */
export function fiberId(fiber: object) {
  let id = ids.get(fiber);
  if (!id) {
    id = nextId++;
    ids.set(fiber, id);
  }
  return id;
}

/** The HostRoot fiber React keeps on a createRoot container, under a randomized key. */
export function containerFiber(container: Element): Fiber | null {
  const key = Object.keys(container).find((k) => k.startsWith("__reactContainer$"));
  return key ? ((container as unknown as Record<string, Fiber>)[key] ?? null) : null;
}

/** The committed ("current") HostRoot: the FiberRoot's `current`, which flips between two copies on every commit. */
export function currentRoot(container: Element): Fiber | null {
  const fiber = containerFiber(container);
  const fiberRoot = fiber?.stateNode as { current?: Fiber } | undefined;
  return fiberRoot?.current ?? fiber;
}

function short(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value.length > 24 ? value.slice(0, 24) + "…" : value);
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value && typeof value === "object") return "{…}";
  return String(value);
}

/** Hooks are a linked list on memoizedState: state hooks have a queue, effects a create function, refs a { current }. */
function hookList(fiber: Fiber): string[] {
  if (fiber.tag !== 0 && fiber.tag !== 15 && fiber.tag !== 11) return [];
  const out: string[] = [];
  let hook = fiber.memoizedState as { memoizedState: unknown; queue: unknown; next: unknown } | null;
  for (let i = 0; hook && i < 20; i++) {
    const s = hook.memoizedState as Record<string, unknown> | null;
    if (hook.queue) out.push(`state: ${short(hook.memoizedState)}`);
    else if (s && typeof s === "object" && "create" in s) out.push("effect");
    else if (s && typeof s === "object" && "current" in s && Object.keys(s).length === 1) out.push(`ref: ${short(s.current)}`);
    else out.push(`memo: ${short(Array.isArray(s) ? s[0] : s)}`);
    hook = hook.next as typeof hook;
  }
  return out;
}

function describe(fiber: Fiber): { name: string; detail: string } {
  const type = fiber.type as { name?: string; displayName?: string } | string | null;
  if (fiber.tag === 6) return { name: "text", detail: short(fiber.memoizedProps) };
  if (fiber.tag === 3) return { name: "root", detail: "" };
  const name = typeof type === "string" ? type : (type?.displayName ?? type?.name ?? FIBER_TAGS[fiber.tag] ?? "?");
  const props = fiber.memoizedProps && typeof fiber.memoizedProps === "object" ? fiber.memoizedProps : {};
  const detail = Object.entries(props)
    .filter(([k]) => k !== "children")
    .slice(0, 3)
    .map(([k, v]) => `${k}=${short(v)}`)
    .join(" ");
  return { name, detail };
}

export function viewTree(fiber: Fiber | null, depth = 0): FiberView[] {
  const out: FiberView[] = [];
  for (let f = fiber; f && depth < 40; f = f.sibling) {
    const { name, detail } = describe(f);
    out.push({ id: fiberId(f), tag: FIBER_TAGS[f.tag] ?? `tag ${f.tag}`, name, key: f.key, detail, hooks: hookList(f), children: viewTree(f.child, depth + 1) });
  }
  return out;
}

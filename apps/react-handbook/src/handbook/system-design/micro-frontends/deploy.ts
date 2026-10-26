import { PIECES, piece, type PieceId, type Slot } from "./store";

// Independent releases and what the shopper sees when one of them goes wrong.
// Each piece keeps a stack of builds; the top of each stack is what the shell's
// manifest points at.

export type BuildKind = "good" | "crash" | "contract";
export type Build = { version: string; kind: BuildKind };
export type PieceState = { history: readonly Build[]; slow: boolean };
export type StoreState = Record<PieceId, PieceState>;

export const INITIAL_STATE = Object.fromEntries(
  PIECES.map((p): [PieceId, PieceState] => [p.id, { history: [{ version: p.version, kind: "good" }], slow: false }]),
) as StoreState;

/** How long the shell waits for a piece before showing its fallback, ms. */
export const TIMEOUT_MS = 1500;
/** How long a slow piece takes, ms. */
export const SLOW_MS = 4000;

export const current = (state: StoreState, id: PieceId) => state[id].history.at(-1)!;

function bumpMinor(version: string) {
  const [major, minor] = version.split(".").map(Number);
  return `${major}.${minor + 1}.0`;
}

export function release(state: StoreState, id: PieceId, kind: BuildKind): StoreState {
  const history = [...state[id].history, { version: bumpMinor(current(state, id).version), kind }];
  return { ...state, [id]: { ...state[id], history } };
}

export function rollback(state: StoreState, id: PieceId): StoreState {
  if (state[id].history.length < 2) return state;
  return { ...state, [id]: { ...state[id], history: state[id].history.slice(0, -1) } };
}

export function setSlow(state: StoreState, id: PieceId, slow: boolean): StoreState {
  return { ...state, [id]: { ...state[id], slow } };
}

/** What a build that changes its event or props contract breaks, and where. */
const CONTRACT_BREAK: Record<PieceId, { slot: Slot; text: string }> = {
  shell: { slot: "main", text: 'Price shows "undefined": the shell renamed the locale it passes down' },
  catalog: { slot: "header", text: 'Cart count shows "NaN": catalog renamed a field in cart:item-added' },
  checkout: { slot: "header", text: "Cart count stops updating: checkout renamed cart:updated" },
  account: { slot: "header", text: 'Greeting shows "Hi, undefined": account changed the user:signed-in payload' },
};

export type SlotView = { slot: Slot; owner: PieceId; shows: "content" | "fallback" | "loading" | "wrong"; text: string };
export type PageView = { status: "ok" | "degraded" | "down" | "waiting"; headline: string; slots: SlotView[]; requirements: { label: string; met: boolean }[] };

export function outcome(state: StoreState, isolation: boolean): PageView {
  const crashed = PIECES.filter((p) => current(state, p.id).kind === "crash").map((p) => p.id);
  const slow = PIECES.filter((p) => state[p.id].slow).map((p) => p.id);
  const contracts = PIECES.filter((p) => current(state, p.id).kind === "contract").map((p) => p.id);

  const slots: SlotView[] = PIECES.map((p) => {
    const view: SlotView = { slot: p.onProductPage.slot, owner: p.id, shows: "content", text: p.onProductPage.label };
    if (crashed.includes(p.id)) return { ...view, shows: "fallback", text: `${p.onProductPage.label} is unavailable right now` };
    if (slow.includes(p.id)) return { ...view, shows: "loading", text: `Placeholder after ${TIMEOUT_MS / 1000} s; content at ${SLOW_MS / 1000} s` };
    return view;
  });
  for (const id of contracts) {
    const hit = slots.find((s) => s.slot === CONTRACT_BREAK[id].slot)!;
    if (hit.shows === "content") Object.assign(hit, { shows: "wrong", text: CONTRACT_BREAK[id].text });
  }

  const shellCrashed = crashed.includes("shell");
  const down = shellCrashed || (!isolation && crashed.length > 0);
  const waiting = !down && !isolation && slow.length > 0;

  let status: PageView["status"] = "ok";
  let headline = "Every piece rendered.";
  if (down) {
    status = "down";
    headline = shellCrashed
      ? "Blank page: the shell itself crashed, and nothing above it can catch the error. Keep the shell small and boring."
      : `Blank page: ${crashed.map((id) => piece(id).name).join(" and ")} threw while rendering, and with no boundary the error unmounted the whole page.`;
  } else if (waiting) {
    status = "waiting";
    headline = `Spinner for ${SLOW_MS / 1000} s: the shell waits for every piece, so the slowest (${slow.map((id) => piece(id).name).join(", ")}) sets the pace for the page.`;
  } else if (slots.some((s) => s.shows !== "content")) {
    status = "degraded";
    headline = contracts.length > 0 && crashed.length === 0 && slow.length === 0 ? "The page renders, but shows wrong data. Boundaries can't catch a broken contract." : "The page works; the affected slots show a fallback.";
  }

  return {
    status,
    headline,
    slots,
    requirements: [
      { label: "One broken piece doesn't take down the page", met: !down },
      { label: "Page meets its load-time budget", met: !waiting },
      { label: "Pieces agree on shared data", met: contracts.length === 0 },
      { label: "Each team released without waiting for the others", met: true },
    ],
  };
}

// The shop's single source of truth: one pure reducer with a typed action
// union. Cart changes are kept as a history of cart states (undo, redo and
// time travel move one pointer), and every action is recorded in a log.
// Impure details (ids, timestamps) are stamped by the action creators.

import type { Adjustment, DiscountCode, Order } from "@/server/practices/context-reducer/shop.schema";

import {
  addItem,
  clearCart,
  diffCarts,
  EMPTY_CART,
  enforceDiscount,
  removeItem,
  setDiscount,
  setQty,
  type Cart,
  type Change,
} from "./cart";

export const HISTORY_LIMIT = 50;
const LOG_LIMIT = 100;

type Meta = { readonly id: number; readonly at: number };

/** Actions that change the cart: undoable and jumpable. */
export type CartAction =
  | { type: "cart/add"; productId: string; stock: number }
  | { type: "cart/setQty"; productId: string; qty: number; stock: number }
  | { type: "cart/remove"; productId: string }
  | { type: "cart/clear" }
  | { type: "cart/applyDiscount"; code: DiscountCode }
  | { type: "cart/removeDiscount" };

type OtherAction =
  | { type: "history/undo" }
  | { type: "history/redo" }
  | { type: "history/jump"; stateId: number }
  | { type: "log/clear" }
  | { type: "notice/dismiss" }
  | { type: "cart/hydrated"; cart: Cart; notes: string[] }
  | { type: "cart/synced"; cart: Cart }
  | { type: "catalog/loaded"; count: number }
  | { type: "checkout/started" }
  | { type: "checkout/succeeded"; order: Order }
  | { type: "checkout/failed"; message: string; adjustments: Adjustment[]; adjustedCart: Cart | null };

export type Action = (CartAction | OtherAction) & { meta: Meta };
export type ActionType = Action["type"];

export type LogEntry = {
  id: number;
  at: number;
  action: Action;
  changes: Change[];
  /** The history state this action produced; null when not jumpable. */
  stateId: number | null;
};

export type CheckoutState =
  | { status: "idle" }
  | { status: "pending"; snapshot: Cart }
  | { status: "succeeded"; order: Order }
  | { status: "failed"; message: string; adjustments: Adjustment[] };

export type AppState = {
  history: { states: readonly { id: number; cart: Cart }[]; index: number };
  nextStateId: number;
  log: readonly LogEntry[];
  checkout: CheckoutState;
  /** The saved cart has been applied (or there was none). */
  hydrated: boolean;
  notice: string | null;
};

export function createInitialState(): AppState {
  return {
    history: { states: [{ id: 0, cart: EMPTY_CART }], index: 0 },
    nextStateId: 1,
    log: [],
    checkout: { status: "idle" },
    hydrated: false,
    notice: null,
  };
}

// -- selectors -----------------------------------------------------------------

export function presentCart(state: AppState) {
  return state.history.states[state.history.index].cart;
}

/** What the shopper sees: empty while an order is being placed (optimistic). */
export function visibleCart(state: AppState) {
  return state.checkout.status === "pending" ? EMPTY_CART : presentCart(state);
}

export const isPending = (state: AppState) => state.checkout.status === "pending";
export const canUndo = (state: AppState) => !isPending(state) && state.history.index > 0;
export const canRedo = (state: AppState) =>
  !isPending(state) && state.history.index < state.history.states.length - 1;

// -- action creators -------------------------------------------------------------

let nextActionId = 1;

function meta(): Meta {
  return { id: nextActionId++, at: Date.now() };
}

export const actions = {
  add: (productId: string, stock: number): Action => ({ type: "cart/add", productId, stock, meta: meta() }),
  setQty: (productId: string, qty: number, stock: number): Action => ({ type: "cart/setQty", productId, qty, stock, meta: meta() }),
  remove: (productId: string): Action => ({ type: "cart/remove", productId, meta: meta() }),
  clear: (): Action => ({ type: "cart/clear", meta: meta() }),
  applyDiscount: (code: DiscountCode): Action => ({ type: "cart/applyDiscount", code, meta: meta() }),
  removeDiscount: (): Action => ({ type: "cart/removeDiscount", meta: meta() }),
  undo: (): Action => ({ type: "history/undo", meta: meta() }),
  redo: (): Action => ({ type: "history/redo", meta: meta() }),
  jump: (stateId: number): Action => ({ type: "history/jump", stateId, meta: meta() }),
  clearLog: (): Action => ({ type: "log/clear", meta: meta() }),
  dismissNotice: (): Action => ({ type: "notice/dismiss", meta: meta() }),
  hydrated: (cart: Cart, notes: string[]): Action => ({ type: "cart/hydrated", cart, notes, meta: meta() }),
  synced: (cart: Cart): Action => ({ type: "cart/synced", cart, meta: meta() }),
  catalogLoaded: (count: number): Action => ({ type: "catalog/loaded", count, meta: meta() }),
  checkoutStarted: (): Action => ({ type: "checkout/started", meta: meta() }),
  checkoutSucceeded: (order: Order): Action => ({ type: "checkout/succeeded", order, meta: meta() }),
  checkoutFailed: (message: string, adjustments: Adjustment[], adjustedCart: Cart | null): Action => ({
    type: "checkout/failed", message, adjustments, adjustedCart, meta: meta(),
  }),
};

// -- reducer -----------------------------------------------------------------------

function withLog(state: AppState, action: Action, changes: Change[] = [], stateId: number | null = null): AppState {
  const entry: LogEntry = { id: action.meta.id, at: action.meta.at, action, changes, stateId };
  return { ...state, log: [entry, ...state.log].slice(0, LOG_LIMIT) };
}

/** Pushes a new cart state, dropping any redo future and the oldest past. */
function pushCart(state: AppState, action: Action, cart: Cart, notice: string | null = state.notice): AppState {
  const prev = presentCart(state);
  const id = state.nextStateId;
  let states = [...state.history.states.slice(0, state.history.index + 1), { id, cart }];
  if (states.length > HISTORY_LIMIT + 1) states = states.slice(states.length - HISTORY_LIMIT - 1);
  const next: AppState = {
    ...state,
    history: { states, index: states.length - 1 },
    nextStateId: id + 1,
    notice,
  };
  return withLog(next, action, diffCarts(prev, cart), id);
}

/** Replaces history with one state (saved cart, other tab, placed order). */
function resetCart(state: AppState, cart: Cart): AppState {
  const id = state.nextStateId;
  return { ...state, history: { states: [{ id, cart }], index: 0 }, nextStateId: id + 1 };
}

function applyCartAction(cart: Cart, action: CartAction): Cart {
  switch (action.type) {
    case "cart/add":
      return addItem(cart, action.productId, action.stock);
    case "cart/setQty":
      return setQty(cart, action.productId, action.qty, action.stock);
    case "cart/remove":
      return removeItem(cart, action.productId);
    case "cart/clear":
      return clearCart(cart);
    case "cart/applyDiscount":
      return setDiscount(cart, action.code);
    case "cart/removeDiscount":
      return setDiscount(cart, null);
  }
}

function moveTo(state: AppState, action: Action, index: number): AppState {
  if (isPending(state) || index === state.history.index) return state;
  const prev = presentCart(state);
  const next = { ...state, history: { ...state.history, index } };
  return withLog(next, action, diffCarts(prev, presentCart(next)));
}

export function shopReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "cart/add":
    case "cart/setQty":
    case "cart/remove":
    case "cart/clear":
    case "cart/applyDiscount":
    case "cart/removeDiscount": {
      if (isPending(state)) return state; // cart is locked while ordering
      const present = presentCart(state);
      const changed = applyCartAction(present, action);
      if (changed === present) return withLog(state, action);
      const { cart, notice } = enforceDiscount(changed);
      return pushCart(state, action, cart, notice ?? (action.type === "cart/clear" ? null : state.notice));
    }
    case "history/undo":
      return canUndo(state) ? moveTo(state, action, state.history.index - 1) : state;
    case "history/redo":
      return canRedo(state) ? moveTo(state, action, state.history.index + 1) : state;
    case "history/jump": {
      const index = state.history.states.findIndex((s) => s.id === action.stateId);
      return index === -1 ? state : moveTo(state, action, index);
    }
    case "log/clear":
      return { ...state, log: [] };
    case "notice/dismiss":
      return state.notice === null ? state : { ...state, notice: null };
    case "cart/hydrated": {
      const next = resetCart(state, action.cart);
      return withLog(
        { ...next, hydrated: true, notice: action.notes.length > 0 ? action.notes.join(" ") : state.notice },
        action,
        diffCarts(presentCart(state), action.cart),
      );
    }
    case "cart/synced":
      if (isPending(state)) return state;
      return withLog(resetCart(state, action.cart), action, diffCarts(presentCart(state), action.cart));
    case "catalog/loaded":
      return withLog(state, action);
    case "checkout/started":
      if (isPending(state) || presentCart(state).lines.length === 0) return state;
      return withLog({ ...state, checkout: { status: "pending", snapshot: presentCart(state) } }, action);
    case "checkout/succeeded":
      // The order is placed: nothing left to undo back to.
      return withLog(
        { ...resetCart(state, EMPTY_CART), checkout: { status: "succeeded", order: action.order } },
        action,
        diffCarts(presentCart(state), EMPTY_CART),
      );
    case "checkout/failed": {
      // The real cart never left the history: failing is the rollback.
      const failed: AppState = {
        ...state,
        checkout: { status: "failed", message: action.message, adjustments: action.adjustments },
      };
      return action.adjustedCart ? pushCart(failed, action, action.adjustedCart) : withLog(failed, action);
    }
    default: {
      const unhandled: never = action;
      return unhandled;
    }
  }
}

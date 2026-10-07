"use client";

// Three ways to share the same reducer state, switchable at runtime:
//
// - single:   one context holding { state, dispatch }. The value is a new
//             object on every render, so every consumer re-renders on every
//             action, even components that only dispatch.
// - split:    state and dispatch in separate contexts. `dispatch` never
//             changes, so dispatch-only components stop re-rendering; state
//             readers still re-render on every action.
// - selector: a store (whose identity never changes) in context; each
//             component subscribes with `useSyncExternalStore` to the value
//             its selector returns, and re-renders only when that changes.
//
// Components use the same two hooks in every mode; the mounted provider
// decides what they subscribe to.

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { beginAction, type Strategy } from "./render-counter";
import { shopReducer, type Action, type AppState } from "./shop-reducer";
import { createStore, type ShopStore } from "./shop-store";

export type Dispatch = (action: Action) => void;

const SingleContext = createContext<{ state: AppState; dispatch: Dispatch } | null>(null);
const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch | null>(null);
const StoreContext = createContext<ShopStore | null>(null);

type ProviderProps = {
  strategy: Strategy;
  /** Read once, when the provider mounts. */
  initial: () => AppState;
  /** Reports every new state and the (stable) dispatch to the shop root. */
  onState: (state: AppState) => void;
  onDispatch: (dispatch: Dispatch) => void;
  children: React.ReactNode;
};

/** Wraps dispatch so each action starts a render report. */
function useCountedDispatch(dispatch: Dispatch, strategy: Strategy, onDispatch: ProviderProps["onDispatch"]) {
  const counted = useCallback(
    (action: Action) => {
      beginAction(action.type, strategy);
      dispatch(action);
    },
    [dispatch, strategy],
  );
  useLayoutEffect(() => onDispatch(counted), [counted, onDispatch]);
  return counted;
}

function SingleProvider({ strategy, initial, onState, onDispatch, children }: ProviderProps) {
  const [state, dispatch] = useReducer(shopReducer, undefined, initial);
  const counted = useCountedDispatch(dispatch, strategy, onDispatch);
  useLayoutEffect(() => onState(state), [state, onState]);
  // A new object every render: this is the bug the other strategies fix.
  return <SingleContext value={{ state, dispatch: counted }}>{children}</SingleContext>;
}

function SplitProvider({ strategy, initial, onState, onDispatch, children }: ProviderProps) {
  const [state, dispatch] = useReducer(shopReducer, undefined, initial);
  const counted = useCountedDispatch(dispatch, strategy, onDispatch);
  useLayoutEffect(() => onState(state), [state, onState]);
  return (
    <DispatchContext value={counted}>
      <StateContext value={state}>{children}</StateContext>
    </DispatchContext>
  );
}

function SelectorProvider({ strategy, initial, onState, onDispatch, children }: ProviderProps) {
  const [store] = useState(() => createStore(shopReducer, initial()));
  const counted = useCountedDispatch(store.dispatch, strategy, onDispatch);
  const [value] = useState<ShopStore>(() => ({ ...store, dispatch: (action) => counted(action) }));
  useLayoutEffect(() => {
    onState(store.getState());
    return store.subscribe(() => onState(store.getState()));
  }, [store, onState]);
  return <StoreContext value={value}>{children}</StoreContext>;
}

export function ShopProvider(props: ProviderProps) {
  switch (props.strategy) {
    case "single":
      return <SingleProvider {...props} />;
    case "split":
      return <SplitProvider {...props} />;
    case "selector":
      return <SelectorProvider {...props} />;
  }
}

function noSubscription() {
  return () => {};
}

export function shallowEqual<T>(a: readonly T[], b: readonly T[]) {
  return a === b || (a.length === b.length && a.every((v, i) => Object.is(v, b[i])));
}

/**
 * Reads a slice of the shop state. With the store, the component re-renders
 * only when `isEqual(previous, next)` is false; with contexts, whenever the
 * context value changes.
 */
export function useShopSelector<T>(selector: (state: AppState) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  const single = useContext(SingleContext);
  const split = useContext(StateContext);
  const store = useContext(StoreContext);
  // Memoized per store state, so getSnapshot returns a stable value.
  const cache = useRef<{ state: AppState; value: T } | null>(null);

  const getSnapshot = () => {
    if (!store) return undefined as T;
    const state = store.getState();
    const previous = cache.current;
    if (previous && previous.state === state) return previous.value;
    const value = selector(state);
    if (previous && isEqual(previous.value, value)) {
      cache.current = { state, value: previous.value };
      return previous.value;
    }
    cache.current = { state, value };
    return value;
  };

  const selected = useSyncExternalStore(store ? store.subscribe : noSubscription, getSnapshot, getSnapshot);
  if (store) return selected;
  const state = single?.state ?? split;
  if (!state) throw new Error("useShopSelector must be used inside <ShopProvider>");
  return selector(state);
}

export function useShopDispatch(): Dispatch {
  const single = useContext(SingleContext);
  const dispatch = useContext(DispatchContext);
  const store = useContext(StoreContext);
  const result = single?.dispatch ?? dispatch ?? store?.dispatch;
  if (!result) throw new Error("useShopDispatch must be used inside <ShopProvider>");
  return result;
}

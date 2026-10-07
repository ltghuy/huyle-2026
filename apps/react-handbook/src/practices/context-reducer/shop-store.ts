// A tiny store around the same reducer, for the "Selectors" strategy: the
// store object never changes, so a context holding it never re-renders
// anyone; components subscribe to just the slice they read.

import type { Action, AppState } from "./shop-reducer";

export type ShopStore = {
  getState: () => AppState;
  dispatch: (action: Action) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore(reducer: (state: AppState, action: Action) => AppState, initial: AppState): ShopStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

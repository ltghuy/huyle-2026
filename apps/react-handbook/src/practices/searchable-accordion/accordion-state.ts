export type ExpandMode = "single" | "multiple";

export type AccordionState = {
  /** Open section ids, most recently opened last. */
  open: string[];
  mode: ExpandMode;
};

export type AccordionAction =
  | { type: "toggle"; id: string }
  | { type: "setMode"; mode: ExpandMode }
  | { type: "expand"; ids: string[] }
  | { type: "collapse"; ids: string[] };

export const INITIAL_ACCORDION_STATE: AccordionState = { open: [], mode: "multiple" };

// Filtering never touches this state, so sections stay open while hidden.
export function accordionReducer(
  state: AccordionState,
  action: AccordionAction,
): AccordionState {
  switch (action.type) {
    case "toggle": {
      if (state.open.includes(action.id)) {
        return { ...state, open: state.open.filter((id) => id !== action.id) };
      }
      return {
        ...state,
        open: state.mode === "single" ? [action.id] : [...state.open, action.id],
      };
    }
    case "setMode":
      return {
        mode: action.mode,
        open: action.mode === "single" ? state.open.slice(-1) : state.open,
      };
    case "expand": {
      if (state.mode === "single") return state;
      const current = new Set(state.open);
      const added = action.ids.filter((id) => !current.has(id));
      return added.length ? { ...state, open: [...state.open, ...added] } : state;
    }
    case "collapse": {
      const removed = new Set(action.ids);
      const open = state.open.filter((id) => !removed.has(id));
      return open.length === state.open.length ? state : { ...state, open };
    }
  }
}

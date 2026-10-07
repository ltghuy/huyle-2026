---
id: "010"
feature: context-reducer
created: 2026-10-07
---

# Decisions: Context + useReducer State Management

Decisions on gray areas and ambiguities resolved during discussion.

## Resolved

### Domain

- **Question:** What app does the state drive?
- **Decision:** A shop: catalog from the mock API, cart with quantities and discount codes, header badge, totals, checkout.
- **Rationale:** Many components read small slices of one state, so wasted re-renders are easy to see.
- **Caveats:** No filtering or search (other practices cover them).

### Re-render strategies

- **Question:** How is "context without extra re-renders" shown?
- **Decision:** Three switchable strategies (single context, split state/dispatch contexts, selectors on a subscribed store) with live render counters on every consumer.
- **Rationale:** The comparison is the lesson.
- **Caveats:** Switching must keep the cart, history and log.

### Extras

- **Question:** Which extras does the reducer support?
- **Decision:** All four: undo/redo, action log with time travel, persistence (versioned, migrated, cross-tab), async checkout with optimistic update and rollback.
- **Rationale:** Each is a common real requirement on top of a reducer.
- **Caveats:** Makes the feature Complex scope.

### Action typing

- **Question:** How strict are action types?
- **Decision:** A plain TypeScript discriminated union with an exhaustive `never` check and typed action creators; no runtime validation of actions.
- **Rationale:** Compile-time safety without libraries.
- **Caveats:** Saved carts and data from other tabs are still validated at runtime (they are untrusted input, per the project rule for trust boundaries), but that validates data, not actions.

### Time travel and undo share one history

- **Question:** Are time travel and undo separate mechanisms? (agent default, not asked)
- **Decision:** One history of cart states. Jumping to a log entry moves the same pointer as undo/redo; only cart-changing actions are jumpable.
- **Rationale:** Two histories would disagree; one pointer keeps them consistent.
- **Caveats:** Non-cart actions appear in the log for context only.

### Sync from another tab resets history

- **Question:** What happens to undo history when another tab changes the cart? (agent default, not asked)
- **Decision:** The synced cart becomes the current state and undo history is cleared, with a log entry.
- **Rationale:** Undoing here a change made elsewhere would fight the other tab.
- **Caveats:** The other tab keeps its own history.

## Tentative

None.

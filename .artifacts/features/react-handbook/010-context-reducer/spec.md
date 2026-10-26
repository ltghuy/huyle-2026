---
id: "010"
feature: context-reducer
type: greenfield
scope: complex
status: done
branch: main
created: 2026-10-07
---

# Feature: Context + useReducer State Management

## Overview

Practice 9 of the playground. The learner wants to manage shared app state
without a state library: one reducer with typed actions owns the data, React
context makes it available to any component, and components re-render only
when the part of the state they show actually changes. It's a good exercise
because the textbook version ("put the state in a context") quietly
re-renders every consumer on every change, and because real requirements
pile on top of a reducer: undo, a record of what happened, surviving a
reload, staying in sync across tabs, and talking to a server.

The demo is a small shop: a product catalog loaded from the project's mock
API, a cart with quantities and discount codes, a header badge, totals, and
checkout against the mock API. The learner can switch between three ways of
sharing the state (one context, separate state and dispatch contexts, and a
subscription with selectors) while render counters on every component show
the cost of each. Undo/redo, an action log with time travel, persistence
with migration and cross-tab sync, and asynchronous checkout complete it.
Cross-practice rules from feature 001 apply (core logic hand-built, no state
library, explanation guide + demo controls).

## Goals

- [x] Every change to the cart goes through one pure reducer with typed actions, and an action type the reducer doesn't handle is a compile-time error.
- [x] The learner can see and measure wasted re-renders: with selectors, an action re-renders only the components whose data changed, while the naive approach re-renders every consumer.
- [x] Any cart change can be undone and redone, and the learner can inspect every action and jump to the state after any of them.
- [x] The cart survives reloads (including from an older saved format) and stays the same in every open tab.
- [x] Checkout talks to the server with clear pending, success and failure states, and a failure never loses the cart.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Product filtering, search, sorting | Practices 2, 12 and 13 cover them; the catalog is a fixed grid |
| User accounts, saved carts on the server, real payment | The checkout is a mock order |
| A state library (Redux, Zustand, Jotai…) or devtools extension | The practice is building the pattern by hand |
| Undoing checkout or server-side effects | Only cart edits are undoable |
| Persisting undo history or the action log across reloads | Only the current cart is saved |

## User Stories

### P1: A cart driven by one reducer

- As a shopper, I want to add products, change quantities, remove lines and apply a discount code so that I can build an order.
- **Why P1:** The state the whole practice manages.
- **Independent Test:** Add three products, raise one to quantity 3, remove another, apply "SAVE10": the header badge, each product card's "In cart" count, the cart lines, subtotal, discount and total all agree after every step.

**Acceptance Criteria:**

- [x] AC-001: WHEN the practice opens THEN system SHALL load the catalog (12 products with name, price, stock and colour, shown as compact cards) from the mock API, showing placeholders while loading and an error with Retry if it fails.
- [x] AC-002: WHEN the shopper adds a product THEN system SHALL add it to the cart with quantity 1, or raise its quantity by 1 if already there, never beyond its stock (the Add button is disabled at stock, with the reason).
- [x] AC-003: WHEN the shopper changes a line's quantity (stepper or typed number) THEN system SHALL keep it between 1 and the product's stock; WHEN the shopper removes a line or clears the cart THEN system SHALL remove it or them.
- [x] AC-004: WHEN the shopper applies a discount code THEN system SHALL accept the known codes (SAVE10: 10% off; BULK15: 15% off from 5 items; FREESHIP: free shipping) case-insensitively, show an inline error for unknown or ineligible codes, and allow removing the code.
- [x] AC-005: WHILE the cart has items THEN system SHALL show, consistent everywhere: item count in the header badge, "In cart: N" on each product card, line totals, subtotal, discount, shipping ($5.00, free from $50.00 after discount or with FREESHIP) and total; amounts SHALL be exact to the cent.
- [x] AC-006: WHEN a discount stops being eligible (e.g. BULK15 after going below 5 items) THEN system SHALL remove it and say why.

### P1: See and avoid wasted re-renders

- As a learner, I want to switch how the state is shared and see how many components re-render so that I understand why the naive context is slow and how to fix it.
- **Why P1:** "Context without extra re-renders" is the practice's point.
- **Independent Test:** In "Single context" mode, add one product: every counter goes up (about 30 components). Switch to "Selectors": add one product: the scoreboard shows the drop, and only that product's card, the cart line(s), totals and the header badge re-render.

**Acceptance Criteria:**

- [x] AC-007: WHILE the demo is shown THEN every component that reads the shared state (header badge, each product card, each cart line, totals, discount form, undo bar, action log) SHALL show a render count that updates on each of its renders; the components that re-rendered for an action SHALL flash (outline and emphasised count) and fade back after about 1.5 s (no fade animation under reduced motion), so the effect of one action can be seen at a glance without the page staying highlighted; the scoreboard and re-render history keep the record.
- [x] AC-008: WHEN the learner picks a sharing strategy ("Single context", "Split state/dispatch", "Selectors") THEN system SHALL switch to it while keeping the cart, history and log exactly as they were.
- [x] AC-009: WHEN an action is dispatched THEN system SHALL report how many components re-rendered for it and which strategy was active, and keep the last 10 such reports.
- [x] AC-028: WHILE the shop is shown THEN a scoreboard SHALL stay visible at the top of the shop while scrolling, holding the strategy switch, the last action with "N of M components re-rendered", and for that action type the latest count measured under each strategy as labelled bars ("not measured yet" when missing).
- [x] AC-010: WHEN "Single context" is active THEN every consumer SHALL re-render on every action; WHEN "Split state/dispatch" is active THEN components that only dispatch (each card's Add button, given only its product and whether it's disabled; the Clear cart button) SHALL NOT re-render on state changes; WHEN "Selectors" is active THEN a component SHALL re-render only when the value it selects changes.
- [x] AC-011: WHEN the learner resets the render counters THEN all counts and reports SHALL return to zero without changing the cart.

### P2: Undo and redo

- As a shopper, I want to undo and redo my cart changes so that mistakes are cheap.
- **Why P2:** Shows why reducer state must be immutable; the cart works without it.

**Acceptance Criteria:**

- [x] AC-012: WHEN the shopper chooses Undo (button or Ctrl/⌘+Z) THEN system SHALL restore the cart as it was before the last cart change; Redo (button, Ctrl/⌘+Shift+Z or Ctrl+Y) SHALL reapply it.
- [x] AC-013: WHEN a new cart change is made after undoing THEN the undone changes SHALL be discarded and Redo disabled.
- [x] AC-014: WHEN focus is in a text field THEN the keyboard shortcuts SHALL do the field's own undo, not the cart's; WHEN nothing can be undone or redone THEN the matching button SHALL be disabled and the shortcut SHALL do nothing.
- [x] AC-015: WHEN undo history exceeds 50 changes THEN the oldest SHALL be dropped.

### P2: Action log and time travel

- As a learner, I want to see every action and jump to the state after any of them so that I can understand how the state evolved.
- **Why P2:** The debugging superpower reducers enable.

**Acceptance Criteria:**

- [x] AC-016: WHEN an action is dispatched THEN the log SHALL show it, newest first, with its type, a short summary of its payload, the time, and what changed (e.g. "Blue mug qty 1 → 2", "discount — → SAVE10", "no change").
- [x] AC-017: WHEN the learner selects a cart-change entry THEN system SHALL show the cart exactly as it was right after that action, mark later entries as "undone", and let new changes discard them (same as undoing that many times).
- [x] AC-018: WHEN an action is not a cart change (catalog load, checkout progress, sync from another tab) THEN the log SHALL show it but SHALL NOT allow jumping to it.
- [x] AC-019: WHEN the learner clears the log THEN entries SHALL disappear but undo history SHALL be kept.

### P2: Persistence and cross-tab sync

- As a shopper, I want my cart to survive a reload and match in every tab so that I don't lose or duplicate it.
- **Why P2:** Real carts persist; reading saved data is a trust boundary.

**Acceptance Criteria:**

- [x] AC-020: WHEN the cart changes THEN system SHALL save it in the browser (products, quantities, discount code; not prices, history or log) in a versioned format; WHEN the practice opens THEN system SHALL restore it without a flash of an empty cart once the catalog has loaded.
- [x] AC-021: WHEN the saved cart is in the previous format THEN system SHALL convert it and continue; WHEN it is unreadable, from an unknown version, or refers to products that no longer exist or quantities beyond stock THEN system SHALL keep what is valid, drop or clamp the rest, and tell the shopper what changed.
- [x] AC-022: WHEN the cart changes in another tab THEN this tab SHALL show the same cart within a second, record the sync in the log, and reset its undo history (a change made elsewhere can't be undone here).
- [x] AC-023: WHEN the learner chooses "Load a v1 save" THEN system SHALL write an old-format cart and restore from it, so the conversion can be watched.

### P2: Asynchronous checkout

- As a shopper, I want to place my order and know whether it worked so that I'm never unsure or left with an empty cart after a failure.
- **Why P2:** Async flows on top of a synchronous reducer.

**Acceptance Criteria:**

- [x] AC-024: WHEN the shopper checks out THEN system SHALL send the cart to the mock API, immediately show the order as "Placing order…" with the cart emptied (optimistic), and block cart changes and repeat submissions until it settles.
- [x] AC-025: WHEN the server confirms THEN system SHALL show the order number and total and keep the cart empty; WHEN it fails THEN system SHALL put the cart back exactly as it was, show the reason with Retry, and allow editing again.
- [x] AC-026: WHEN the server rejects lines (price changed or not enough stock) THEN system SHALL restore the cart with those lines adjusted to the server's values and list what changed.
- [x] AC-027: WHEN the learner changes checkout latency (0–3000 ms) or failure (none, network error, stock conflict) in the demo controls THEN the next checkout SHALL use it.

## Edge Cases

- WHEN an undo or redo happens while a checkout is pending THEN it SHALL be ignored.
- WHEN a saved cart is restored before the catalog loads THEN it SHALL be applied once the catalog is available, so stock and prices can be checked.
- WHEN two tabs change the cart at nearly the same time THEN both SHALL end with the last saved cart.
- WHEN the browser blocks storage (private mode, quota) THEN the cart SHALL keep working for this visit and say it can't be saved.
- WHEN a typed quantity is empty, zero, negative or not a number THEN it SHALL revert to the last valid quantity on blur or Enter.
- WHEN the learner switches strategy during a pending checkout THEN the checkout SHALL still settle into the new strategy.
- WHEN the catalog fails to load THEN the cart SHALL still show its saved lines as "unavailable until the catalog loads" and checkout SHALL be disabled.

## Success Criteria

- [x] With "Selectors", adding one product to a non-empty cart re-renders at most 7 components (that card, its cart line, the cart list, totals, header badge, undo bar, action log), versus all consumers (≥ 30) with "Single context".
- [x] 50 random cart changes (the history limit) followed by 50 undos return the cart to empty, and 50 redos return it to the exact final state (deep equality), with the reducer never mutating a previous state; beyond 50 changes, exactly 50 can be undone.
- [x] Jumping to any log entry shows totals identical to those shown right after that action happened.
- [x] A reload restores the cart with 0 differences; a v1 save converts with 0 differences; a corrupted save never crashes the page.
- [x] A change in one tab appears in a second tab within 1 second.
- [x] A failed checkout restores the cart with 0 differences in 100% of attempts.
- [x] Zero serious or critical accessibility issues, in both themes.

## Open Questions

- None. Decisions are recorded in [decisions.md](decisions.md).

## Notes

- The explanation guide should cover: why a reducer (one place for every change, testable, serialisable actions), typed actions with an exhaustive check, why a single context re-renders everyone (new value object, every consumer subscribes to everything), splitting state and dispatch, selectors on a subscribed store (`useSyncExternalStore`) and stable selected values, undo as a history wrapper around the reducer (immutability makes it cheap), the action log and time travel, saving and migrating persisted state as untrusted input, cross-tab sync with storage events, and async flows (start/success/failure actions, optimistic update and rollback) without middleware libraries.

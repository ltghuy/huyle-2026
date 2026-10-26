---
id: "010"
feature: context-reducer
audited: 2026-10-07
result: passed
---

# Audit: Context + useReducer State Management

Evidence from two sources. Reducer and storage checks ran as a Node script (jiti) against the real modules: deep-frozen states, so any mutation of a previous state throws. UI checks ran on the dev server in headless Chrome (Puppeteer, visible page). Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: One pure reducer with typed actions; an unhandled action type is a compile error | Met | Every cart change is an `Action` handled by `shopReducer`; purity shown by the deep-freeze runs in SC2 and SC6; adding `{ type: "cart/bogus" }` to the `Action` union fails `tsc` with TS2322 "not assignable to type 'never'" at the exhaustive `default` |
| G2: Wasted re-renders can be seen and measured; selectors re-render only what changed | Met | See SC1; scoreboard bars and re-render history show the per-strategy counts |
| G3: Undo/redo; every action inspectable; jump to the state after any of them | Met | See SC2 and SC3 |
| G4: Survives reloads (incl. older format) and stays the same in every tab | Met | See SC4 and SC5 |
| G5: Checkout has pending, success and failure states; a failure never loses the cart | Met | See SC6; pending: button reads "Placing order…" and cart controls are disabled; success: cart emptied, "Order A-1002 placed" shown inline and as a toast |
| SC1: Selectors add ≤ 7 components vs all consumers (≥ 30) in Single context | Met | Non-empty cart, add to an existing line / a new line: Selectors 5 of 37 / 6 of 38 (header badge, card, line, cart list on a new line, totals, action log); Split 24 / 24; Single 35 of 35 / 36 of 36 |
| SC2: 50 changes → 50 undos empty, 50 redos deep-equal; no mutation; > 50 changes → exactly 50 undoable | Met | Seeded random adds, setQty, removes and discount changes: 50 undos → empty, the 51st is a no-op, 50 redos `deepStrictEqual` to the final cart, no throw on frozen states; 70 changes → exactly 50 undos |
| SC3: Jumping to any log entry shows the totals shown right after that action | Met | Reducer: every log entry's jump yields the exact recorded cart (20 changes). UI: 8 adds, then 7 jumps to earlier entries: 0 mismatches in the Totals block |
| SC4: Reload 0 differences; v1 converts with 0 differences; corrupted save never crashes | Met | Reload: cart and totals text identical. `parseSaved(SAMPLE_V1)` equals the expected v2 cart exactly (4 lines, `SAVE10`), then the catalog check applies stock limits and drops the unknown product with notes, saved back as v2. Corrupted sample and 6 junk values: no throw; UI resets to an empty cart with "couldn't be read" notice, page keeps working |
| SC5: A change in one tab appears in a second tab within 1 s | Met | Same-origin second document (iframe) adding products, 5 runs: the first document updated after 68 to 86 ms |
| SC6: A failed checkout restores the cart with 0 differences, 100% of attempts | Met | Reducer: 100 of 100 started → failed (server error) runs keep the cart identical. UI with "Server error": 3 of 3 attempts left the cart and totals text identical, showing "Your cart was restored" with Retry |
| SC7: Zero serious or critical accessibility issues, both themes | Met | axe-core 4.10.2: 0 serious/critical in light and dark, both at rest and during a re-render flash, with a filled cart and the restore notice shown |

## Known minor issues (not blocking)

- The render report closes on `requestAnimationFrame`. In a hidden tab rAF is paused, so renders until the next action join the previous report. Users only act in a visible tab; the audit stood a 16 ms timer in for rAF where the browser tab was hidden.
- Re-render flash fade not observed in an animating browser (hidden tabs pause transitions); the end state was checked with transitions off.
- axe `region` (moderate) on the page itself, carried over from feature 001.

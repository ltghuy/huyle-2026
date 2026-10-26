---
id: "009"
feature: accessible-modal
audited: 2026-10-07
result: passed
---

# Audit: Accessible Modal

Evidence from the T008 runs on a production build (`next build && next start`) driven by headless Chrome scripts. Tab was emulated as the browser's sequential navigation (next non-inert focusable in document order) whenever the page didn't handle the key. Quality gate re-run at audit time: `pnpm typecheck && pnpm lint && pnpm build` pass.

| Target | Classification | Evidence |
|--------|----------------|----------|
| G1: Keyboard users never lose focus and land back where they started | Met | See SC1 and SC2; initial focus: Cancel (confirm), first field (form), first control (settings), title (terms) |
| G2: Nothing behind is reachable; no page shift | Met | 0 focusable elements outside the top dialog; sidebar inert, toaster kept; lower dialogs inert when stacked; `overflow: hidden` on `<html>` while open; see SC3 and SC4 |
| G3: Closing never loses work by accident | Met | See SC6; confirmations ignore the backdrop (logged "backdrop click ignored"); drag from inside to the backdrop doesn't close |
| G4: Other practices can open dialogs and `await confirm()` | Met | `<ModalHost />` in the playground layout; `confirm()` used by two scenarios; toasts raised under an open dialog are on top (hit-tested) and not inert; Back closes everything, settles as cancelled, releases scroll and inert |
| G5: Hand-built vs native comparison | Met | Native confirm opens with focus on Cancel, returns focus to its opener, logs open/close; `closedby` support detected at runtime (not supported in the test browser) |
| SC1: 50 Tab/Shift+Tab presses stay inside, every scenario | Met | 0 escapes in confirm, form, settings (and 3-level stack), terms |
| SC2: Focus returns to opener or fallback 100%, never the body | Met | Escape, backdrop, ×, Cancel, confirm, Save, Keep editing (back to the field), Discard (back to "Edit profile"), 3-level unwind, confirm closing two levels at once; delete → next row, last delete → "New project" |
| SC3: 0 px shift, scroll position unchanged | Met | 0 px horizontal shift of page content and toaster; 16 open/close runs at top, middle, end and near-end scroll positions: 0 px scroll change. The classic-scrollbar `scrollbar-gutter` path was verified by inspection only (headless Chrome uses overlay scrollbars) |
| SC4: 0 elements behind focusable/clickable; 0 serious/critical a11y issues, both themes | Met | Count 0; axe-core 4.10.2: 0 serious/critical with confirm, form, form with errors, terms, 3-level stack and native dialog open, light and dark; destructive button contrast computed directly: 8.06:1 light, 4.66:1 dark |
| SC5: Exit within 250 ms; reduced motion within one frame | Met | 147 ms with animations; animations off: removed within one frame (5 ms). Reduced motion uses the same code path (verified by inspection; OS media query not emulated) |
| SC6: Unsaved edits never lost without "Discard" | Met | Escape, backdrop and Cancel with edits each opened "Discard changes?"; Keep editing kept the edit; the saved profile changed only on Save |

## Known minor issues (not blocking)

- Not verifiable headless: classic-scrollbar gutter, the real on-screen keyboard (sheet sizing from `visualViewport` measured at 740 px without a keyboard), the OS reduced-motion setting, and switching layout by resizing with a dialog open.
- axe skipped the hand-built dialog's buttons for color contrast, so their contrast was computed from computed styles instead.
- Content added to the page after a dialog opens (another library's portal) isn't made inert until the stack changes (noted in the guide).
- axe `region` (moderate) on the page itself, carried over from feature 001.

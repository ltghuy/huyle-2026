---
slug: back-to-top
completed: 2026-10-28
---

# Summary: "Lên đầu trang" button

## What Changed

`BackToTop` is a fixed outline icon button rendered once in the `(app)` layout. A passive scroll listener shows it past 600px; while hidden it is transparent, `pointer-events-none`, `aria-hidden` and out of the tab order. A click calls `window.scrollTo({ top: 0 })`, smooth unless `prefers-reduced-motion: reduce`. It sits at `right-4` and 4.5rem above the bottom on phones (clear of the 3.5rem bottom nav) and at `right-8 bottom-8` from `md`. Focus-mode overlays (z-50) cover it. The grammar topic's sticky "Luyện tập" bar overlapped it on phones, so that bar now carries `data-bottom-bar` and the button moves up to 9.25rem while the page has one (`body:has([data-bottom-bar])`), only below `md`.

Checked in the browser: at 1280px on /vocabulary the button is hidden at the top, shows after scrolling 1,500px and brings the page back to 0; at 390px on a grammar topic it sits at 608 to 652px, above the sticky bar (671 to 744px).

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/back-to-top.tsx` | New button |
| `apps/learn-english/src/components/shell/back-to-top.test.tsx` | Shows past the threshold; smooth or instant scroll |
| `apps/learn-english/src/app/(app)/layout.tsx` | Renders `BackToTop` |
| `apps/learn-english/src/components/grammar/grammar-topic.tsx` | `data-bottom-bar` on the sticky action bar |

## Patterns Discovered

A page's sticky bottom action bar on phones should carry `data-bottom-bar` so floating corner buttons can move above it.

## Follow-Up

None.

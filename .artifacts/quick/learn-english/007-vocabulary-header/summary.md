---
slug: vocabulary-header
completed: 2026-10-27
---

# Summary: A calmer vocabulary header

## What Changed

The owner found the vocabulary header too dense: 26 identical outlined chips with small counts. Now search and level tabs sit on one row (md+), and a card holds the level name, the learned count with a progress bar, and the topic pills. Pills are borderless and fully rounded. A `--learned` percentage drives a background gradient, so each pill shows its progress, and a finished topic adds a check icon, so progress isn't shown by colour alone. The selected pill is solid primary with its count in a light bubble (`in-aria-pressed:`). From md up the list collapses to 8 topics behind "Xem thêm N chủ đề", always keeping the selected one. Phones get one sideways-scrolling row instead, scrolled to the selected pill. Checked in Playwright screenshots in dark and light at 1280 px and 390 px. The page never scrolls sideways at either width.

## Files Modified

| File | Change |
|------|--------|
| `src/components/vocabulary/vocabulary-browser.tsx` | Toolbar row, progress panel, pill styling with learned fill, collapse on md+, scroll-to-selected on phones |

## Patterns Discovered

`group-aria-pressed/toggle:` didn't reach children of the shadcn toggle; `in-aria-pressed:` does. A background gradient on a pill hides `bg-*` colours, so the pressed state also needs `bg-none`.

## Follow-Up

The collapse and the pill fill are only checked visually. The unit test fixture has fewer than 8 topics, so it never shows "Xem thêm".

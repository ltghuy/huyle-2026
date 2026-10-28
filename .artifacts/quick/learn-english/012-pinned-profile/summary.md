---
slug: pinned-profile
completed: 2026-10-28
---

# Summary: Keep the greeting and profile link pinned to the top-right corner

## What Changed

`AccountLink` moved out of `PageHeader` into the `(app)` layout, after the storage banner. It is a zero-height sticky row holding an absolutely placed pill (translucent background, blur, faint ring and shadow), so the greeting and the profile link stay in the top-right corner at every scroll position on phones and desktop. `PageHeader` keeps room for it: a 4.25rem top padding on phones and `md:pr-80` on desktop. At the top of a page it looks as it did after quick 010, except on phones, where the greeting now sits next to the button on the right instead of at the left edge. Checked in the browser at 390px and 1280px, at the top and after scrolling the vocabulary list.

## Files Modified

| File | Change |
|------|--------|
| `src/components/shell/account-link.tsx` | Sticky corner pill |
| `src/app/(app)/layout.tsx` | Renders `AccountLink` once |
| `src/components/shell/page-header.tsx` | No longer renders it; leaves room for it |

## Patterns Discovered

None.

## Follow-Up

The pill covers a little of the content in the corner while scrolling: a tap on the part of a card (for example a vocabulary card) that is under the pill reaches the pill instead. The rest of the card still works.

---
slug: selection-color
completed: 2026-10-21
---

# Summary: Green text selection color

## What Changed

Added `--selection` and `--selection-foreground` tokens to `globals.css` and a global `::selection` rule that uses them. Light mode gets a darker green (Tailwind green-700) with near-white text. Dark mode gets a lighter green (the same value as `--success` there) with near-black text, so selected text stays readable on both themes. The tokens are registered in `@theme inline`, so `bg-selection` and `text-selection-foreground` utilities also work.

## Files Modified

| File | Change |
|------|--------|
| src/app/globals.css | New selection tokens for `:root` and `.dark`, theme mapping, and a `::selection` rule in the base layer |

## Patterns Discovered

None

## Follow-Up

None

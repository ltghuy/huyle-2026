---
slug: blurred-top-band
completed: 2026-10-28
---

# Summary: Blurred band behind the greeting at the top

## What Changed

The sticky zero-height row of `AccountLink` now also holds an `aria-hidden`, `pointer-events-none` band: `bg-background/70`, `backdrop-blur-md` and `mask-b-from-70%` for a soft bottom edge. Its height matches PageHeader's top padding (4.25rem, `md:` 4.75rem), so at the top of a page it covers only empty space, and it spans the content column, not the sidebar. Checked at 1280px on /vocabulary scrolled 520px: the band is 1024×76px at the top of the column with a 12px blur, and the cards under it are blurred.

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/shell/account-link.tsx` | Blurred band behind the pill |

## Patterns Discovered

None.

## Follow-Up

Not checked on a phone in the browser; the band uses the same heights as the header's phone padding.

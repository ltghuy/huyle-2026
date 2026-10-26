---
slug: favicon
completed: 2026-10-12
---

# Summary: Replace the default Next.js favicon with the handbook mark

## What Changed

Replaced the default favicon with the sidebar brand mark: the lucide `BookOpenText` icon (paths copied from lucide-react v1.52.0, ISC) in `#fafafa` on a `#171717` rounded square, matching light-mode `--primary` / `--primary-foreground`. Added `icon.svg` for modern browsers, a 16/32/48 px `favicon.ico` for legacy ones, and a 180 px full-bleed `apple-icon.png`. Next's metadata file conventions emit the `<link>` tags; `pnpm build` passes and lists `/icon.svg` and `/apple-icon.png`.

## Files Modified

| File | Change |
|------|--------|
| src/app/icon.svg | new: 32×32 vector favicon |
| src/app/favicon.ico | replaced: 16/32/48 px PNG-in-ICO |
| src/app/apple-icon.png | new: 180×180 touch icon |

## Patterns Discovered

None.

## Follow-Up

If the sidebar brand icon changes, regenerate these three files to match.

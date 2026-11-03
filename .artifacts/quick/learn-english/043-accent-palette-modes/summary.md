---
slug: accent-palette-modes
completed: 2026-11-03
---

# Summary: Main colours that hold up in light and dark mode

## What Changed

Computed WCAG contrast from the OKLCH tokens for each accent in both modes (button text, primary text on background, card and muted, active sidebar item, focus ring, swatch on card). Text already passed everywhere. Two things didn't hold up:

- Swatches were fixed 500 shades. In light mode they were lighter than the buttons they stood for, and teal (2.4:1) and orange (2.9:1) fell below 3:1 on the card. They now use `--swatch-*`, which is each accent's `--primary` in the current mode (5.0:1 or more), and the check mark uses `primary-foreground` so it stays readable on the light dark-mode swatches.
- Light orange was `oklch(0.553 0.195 38.4)`. That is outside sRGB and gets clipped toward red, and it was nearly the same colour as the streak flame. It is now `oklch(0.56 0.165 45)`, the most orange value that still passes 4.5:1 on muted. With orange picked, `--streak` turns gold in both modes.

After the change, light mode is at least 4.57:1 and dark mode at least 4.85:1 for primary text on every surface. I checked the home and Settings pages in the browser in both modes with orange and teal.

## Files Modified

| File | Change |
|------|--------|
| apps/learn-english/src/app/globals.css | `--swatch-*`, light orange, orange `--streak` |
| apps/learn-english/src/lib/appearance.ts | swatches as CSS variables |
| apps/learn-english/src/components/settings/appearance-setting.tsx | check in `primary-foreground` |
| .artifacts/features/learn-english/004-appearance-settings/spec.md | AC-003 note and fix entry |

## Patterns Discovered

A light-mode orange that carries white text can't be bright: around L 0.56 it is a burnt orange whatever the hue. Some Tailwind 700 shades are outside sRGB, so check what the browser actually renders, not just the number.

## Follow-Up

None.

---
slug: accent-palette-modes
status: done
branch: main
created: 2026-11-03
---

# Quick Task: Main colours that hold up in light and dark mode

## What

Check every main colour in Settings against WCAG in both modes, then fix what fails or looks off. The swatches show the colour each mode will really use, light orange reads as orange rather than brick red, and the streak colour stays distinct when orange is picked. Adjusts feature 004 AC-003.

## Files

- apps/learn-english/src/app/globals.css: `--swatch-*` per mode, light orange primary, `--streak` override for orange
- apps/learn-english/src/lib/appearance.ts: swatches point at `var(--swatch-*)`
- apps/learn-english/src/components/settings/appearance-setting.tsx: check mark in `primary-foreground`

## Expected Outcome

For all five colours in both modes, text in the primary colour reaches at least 4.5:1 on the background, card and muted surfaces, button text on the primary does too, and swatches reach at least 3:1 on the card.

## Quality Gates

- pnpm lint
- pnpm typecheck
- pnpm test

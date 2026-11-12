---
slug: shift-replays-dictation
status: done
branch: main
created: 2026-11-12
---

# Quick Task: Shift replays the dictation sentence

## What

In "Nghe chép", tapping Shift on its own plays the sentence again at normal speed, like "Nghe lại", while the answer is not checked yet.

## Files

- `apps/learn-english/src/components/exercise/dictation-exercise.tsx`
- `apps/learn-english/src/components/exercise/dictation-exercise.test.tsx` (new)

## Expected Outcome

- A Shift press and release with no other key in between replays the clip from the start, also while the cursor is in the answer box
- Shift held to type a capital letter or a symbol (Shift+I, Shift+1) does not replay, and neither does Shift with Ctrl, Alt or Cmd, or a held key repeating
- After the answer is checked, Shift does nothing
- "Nghe lại" announces the shortcut (`aria-keyshortcuts="Shift"`), and on devices with a fine pointer (keyboard and mouse) a line under the buttons reads "Bấm Shift để nghe lại"

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`

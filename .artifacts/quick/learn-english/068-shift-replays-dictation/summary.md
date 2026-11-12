# Summary: Shift replays the dictation sentence

## Changed

- `src/components/exercise/dictation-exercise.tsx`: `useShiftTap` listens on the window while the answer isn't checked. Shift pressed and released with no other key in between plays the clip from the start at normal speed, the same as "Nghe lại". Shift with Ctrl, Alt or Cmd, key repeat, and a window blur between press and release don't count. "Nghe lại" has `aria-keyshortcuts="Shift"` until the answer is checked. Under the buttons, "Bấm Shift để nghe lại" shows only on fine-pointer devices.
- `src/components/exercise/dictation-exercise.test.tsx` (new): a tap replays, from the window and from the answer box; Shift+T, Ctrl+Shift and a repeat don't; nothing happens once checked.

## Gates

- `pnpm --filter learn-english typecheck` and `lint` pass
- `pnpm --filter learn-english test`: 185 files, 1594 tests pass

## Not checked

- In a real browser: running a set needs a signed-in learner, which the headless browser isn't. The unit tests cover the key handling.

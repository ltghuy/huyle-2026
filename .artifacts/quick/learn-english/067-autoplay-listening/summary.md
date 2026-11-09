---
slug: autoplay-listening
completed: 2026-11-10
---

# Summary: Play the word when a listening question shows

## What Changed

`AudioButton` takes an `autoPlay` prop: when the button mounts it creates the clip, plays it once and pauses it on unmount. A failed start stays silent, the same as Nghe chép, since the browser can refuse audio that wasn't started by a tap. The three word listening views pass `autoPlay`. A new runner test checks that the clip plays on show. Lint and typecheck pass; the full suite passed apart from `sync-client.test.ts` "pushes with keepalive when the page is hidden", which failed once in the full run and passed three times on its own (unrelated).

## Files Modified

| File | Change |
|------|--------|
| `apps/learn-english/src/components/exercise/audio-button.tsx` | `autoPlay` prop |
| `apps/learn-english/src/components/exercise/word-exercises.tsx` | listening choice and typing autoplay |
| `apps/learn-english/src/components/exercise/forms-exercises.tsx` | forms listening autoplay |
| `apps/learn-english/src/components/exercise/exercise-runner.test.tsx` | autoplay test; `pause` on the offline stub |
| `.agents/baselines/learn-english/exercise-runner.md` | autoplay behavior |

## Patterns Discovered

None

## Follow-Up

`sync-client.test.ts` keepalive test is flaky under the full run.

---
slug: answer-sounds
status: done
branch: feature/learn-english
created: 2026-10-27
---

# Quick Task: Answer sounds and a self-hiding "Chính xác!" panel

## What

Play a short sound when an answer is checked (a bright chime when it is right, a soft low tone when it is wrong), let the learner turn sounds off in Settings, and hide the "Chính xác!" panel after 2 seconds.

## Files

- `src/lib/answer-sound.ts` (new): Web Audio tones and the on/off preference
- `src/components/exercise/exercise-runner.tsx`: play the sound after grading
- `src/components/exercise/feedback-panel.tsx`: hide a correct-answer panel after 2 s
- `src/components/settings/sound-toggle.tsx` (new), `src/app/(app)/settings/page.tsx`: the switch
- `src/components/exercise/exercise-runner.test.tsx`: auto-hide tests

## Expected Outcome

Checking an answer plays a sound in the same tap (no audio files; the tones are synthesised). A typo that still counts as right plays the right-answer sound. The sound setting is stored per device in localStorage (`learn-english:sound`), on by default. Browsers without Web Audio stay silent.
The "Chính xác!" panel fades away after 2 s. The "Chưa đúng" and "Gần đúng" panels stay until the learner moves on, because they hold the right answer and the explanation (AC-028).

## Quality Gates

Run after the change, before marking done:

- `pnpm --filter learn-english lint`
- `pnpm --filter learn-english typecheck`
- `pnpm --filter learn-english test`
- `pnpm --filter learn-english build`

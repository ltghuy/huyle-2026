---
slug: answer-sounds
completed: 2026-10-27
---

# Summary: Answer sounds and a self-hiding "Chính xác!" panel

## What Changed

Checking an answer now plays a short synthesised sound: two rising sine notes when it is right (a typo that still counts as right included), two falling triangle notes when it is wrong. The sound plays inside the tap that checked the answer, so browsers allow it, and needs no audio files. Settings has a new "Âm thanh" card with a switch to turn it off; the choice is per device in localStorage. The "Chính xác!" panel disappears after 2 s. The wrong and typo panels stay, since they show the right answer and the explanation (AC-028).

## Files Modified

| File | Change |
|------|--------|
| `src/lib/answer-sound.ts` | New: Web Audio tones, on/off preference with a subscribe for `useSyncExternalStore` |
| `src/components/exercise/exercise-runner.tsx` | Plays the sound after grading; keys the feedback panel per step |
| `src/components/exercise/feedback-panel.tsx` | Hides a correct-answer panel after `CORRECT_FEEDBACK_MS` (2000) |
| `src/components/settings/sound-toggle.tsx` | New: the switch |
| `src/app/(app)/settings/page.tsx` | "Âm thanh" card; description mentions sound |
| `src/components/exercise/exercise-runner.test.tsx` | Tests for both sounds, the auto-hide, and the wrong panel staying |

## Patterns Discovered

None.

## Follow-Up

The sound preference is not part of the sync snapshot, so it does not follow the learner to another device. Not checked by ear in a browser yet.
